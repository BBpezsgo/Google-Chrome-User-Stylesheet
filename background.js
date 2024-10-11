'use strict'

chrome.action.onClicked.addListener((tab) => {
    const url = chrome.runtime.getURL('styles/' + new URL(tab.url).hostname + '.css');
    fetch(url)
        .then(() => {
            setPageStyle(tab.url, tab.id)
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: setPageStyle,
                args: [tab.url, tab.id]
            })
        })
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const url = chrome.runtime.getURL('styles/' + new URL(tab.url).hostname + '.css');
    fetch(url)
        .then(() => {
            setPageStyle(tab.url, tab.id)
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: setPageStyle,
                args: [tab.url, tab.id]
            })
        })
})

/**
 * @param {'NONE' | 'ERROR' | 'NOT_FOUND' | 'LOADING' | 'OK'} state
 * @param {number} tabId
 */
function setBadge(state, tabId) {
    if (state == 'OK') {
        chrome.action.setBadgeText({ text: '✓', tabId: tabId })
        chrome.action.setBadgeBackgroundColor({ color: '#666666' })
    } else if (state == 'LOADING') {
        chrome.action.setBadgeText({ text: '⭮', tabId: tabId })
        chrome.action.setBadgeBackgroundColor({ color: '#666666' })
    } else if (state == 'NONE') {
        chrome.action.setBadgeText({ text: '', tabId: tabId })
    } else if (state == 'ERROR') {
        chrome.action.setBadgeText({ text: '!', tabId: tabId })
        chrome.action.setBadgeBackgroundColor({ color: '#DB4437' })
    } else if (state == 'NOT_FOUND') {
        chrome.action.setBadgeText({ text: 'x', tabId: tabId })
        chrome.action.setBadgeBackgroundColor({ color: '#DB4437' })
    } else {
        chrome.action.setBadgeText({ text: '', tabId: tabId })
    }
}

/**
 * @param {'ACTIVE' | 'INACTIVE'} state
 * @param {number} tabId
 */
function setIcon(state, tabId) {
    if (state == 'ACTIVE') {
        chrome.action.setIcon({
            path: {
                16: "images/icon16.png",
                32: "images/icon32.png"
            },
            tabId: tabId
        })
    } else {
        chrome.action.setIcon({
            path: {
                16: "images/iconInactive16.png",
                32: "images/iconInactive32.png"
            },
            tabId: tabId
        })
    }
}

/**
 * @param {string} name
 * @param {number} tabId
 */
function setPageColorOverrides(name, tabId) {
    try {
        const url = chrome.runtime.getURL('styles/' + name + '.ov');
        fetch(url)
            .then((response) => response.text()
                .then((value) => {
                    /** @type {Array<{ key: string; value: string; }>} */
                    const overrides = []

                    value.split('\n').forEach(line => {
                        if (line.includes('>')) {
                            const left = line.split('>')[0].trim()
                            const right = line.split('>')[1].trim()
                            overrides.push({ key: left, value: right })
                        }
                    });

                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: (overrides) => {
                            const allInBody = document.querySelectorAll('body *');
                            for (const element of allInBody) {
                                if (element == undefined || element == null) { continue }
                                if (element.hasAttribute('style') == true) {
                                    /** @type {string} */
                                    const style = element.getAttribute('style')
                                    let ovVal = null
                                    for (let i = 0; i < overrides.length; i++) {
                                        const overrideItem = overrides[i];
                                        if (style.includes(overrideItem.key)) {
                                            ovVal = overrideItem
                                            break
                                        }
                                    }
                                    if (ovVal != null && ovVal != undefined) {
                                        element.setAttribute('style', style.replace(ovVal.key, ovVal.value))
                                    }
                                }
                            }
                        },
                        args: [overrides]
                    })
                        .catch(() => { })
                }))
            .catch(() => { })
            .catch(() => { })
    } catch (error) { }
}

/**
 * @param {number} tabId
 */
function setPageGlobalStyle(tabId) {
    try {
        const urlGlobal = chrome.runtime.getURL('styles/global.css');
        fetch(urlGlobal)
            .then((response) => response.text()
                .then((value) => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: (styleContent) => {
                            let domStyle = document.getElementById('user-global-stylesheet');
                            if (domStyle == null) {
                                domStyle = document.createElement('style')
                                domStyle.id = "user-global-stylesheet";
                            }
                            domStyle.innerHTML = styleContent;
                            document.head.appendChild(domStyle);
                        },
                        args: [value]
                    })
                        .catch(() => { })
                }))
            .catch(() => { })
            .catch(() => { })
    } catch (error) { }
}

/**
 * @param {string | URL} uri
 * @param {number} tabId
 */
function setPageStyle(uri, tabId) {
    if (typeof setBadge !== 'undefined') {
        setBadge('LOADING', tabId)
    }

    try {
        const domain = new URL(uri).hostname
        const url = chrome.runtime.getURL('styles/' + domain + '.css');
        fetch(url)
            .then((response) => response.text().then((value) => {
                setPageGlobalStyle(tabId)
                setPageColorOverrides(domain, tabId)
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (styleContent) => {
                        let domStyle = document.getElementById('user-stylesheet');
                        if (domStyle == null) {
                            domStyle = document.createElement('style')
                            domStyle.id = "user-stylesheet";
                        }
                        domStyle.innerHTML = styleContent;
                        document.head.appendChild(domStyle);
                    },
                    args: [value]
                })
                    .then(() => {
                        setBadge('NONE', tabId)
                        setIcon('ACTIVE', tabId)
                    })
                    .catch(() => {
                        setBadge('ERROR', tabId)
                        setIcon('INACTIVE', tabId)
                    })
            }))
            .catch(() => {
                if (typeof setBadge !== 'undefined') {
                    setBadge('NONE', tabId)
                }
                if (typeof setIcon !== 'undefined') {
                    setIcon('INACTIVE', tabId)
                }
            })
    } catch (error) {
        setBadge('ERROR', tabId)
        setIcon('INACTIVE', tabId)
    }
}