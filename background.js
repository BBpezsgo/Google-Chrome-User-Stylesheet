'use strict'

const enableLogs = false

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url.startsWith("chrome")) {
        SetPageStyle(tab.url, tab.id, enableLogs)
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: SetPageStyle,
            args: [tab.url, tab.id, enableLogs]
        })
    }
})

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    if (!tab.url.startsWith("chrome")) {
        SetPageStyle(tab.url, tab.id, enableLogs)
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: SetPageStyle,
            args: [tab.url, tab.id, enableLogs]
        })
    }
})

/** @param {'NONE' | 'ERROR' | 'NOT_FOUND' | 'LOADING' | 'OK'} state */
function SetBadge(state, tabID) {
    if (state == 'OK') {
        chrome.action.setBadgeText({ text: '✓', tabId: tabID })
        chrome.action.setBadgeBackgroundColor({color: '#666666'})
    } else if (state == 'LOADING') {
        chrome.action.setBadgeText({ text: '⭮', tabId: tabID })
        chrome.action.setBadgeBackgroundColor({color: '#666666'})
    } else if (state == 'NONE') {
        chrome.action.setBadgeText({ text: '', tabId: tabID })
    } else if (state == 'ERROR') {
        chrome.action.setBadgeText({ text: '!', tabId: tabID })
        chrome.action.setBadgeBackgroundColor({color: '#DB4437'})
    } else if (state == 'NOT_FOUND') {
        chrome.action.setBadgeText({ text: 'x', tabId: tabID })
        chrome.action.setBadgeBackgroundColor({color: '#DB4437'})
    } else {
        chrome.action.setBadgeText({ text: '', tabId: tabID })
    }
}

/** @param {'ACTIVE' | 'INACTIVE'} state */
function SetIcon(state, tabID) {
    if (state == 'ACTIVE') {
        chrome.action.setIcon({
            path: {
                16: "images/icon16.png",
                32: "images/icon32.png"
            },
            tabId: tabID
        })
    } else {
        chrome.action.setIcon({
            path: {
                16: "images/iconInactive16.png",
                32: "images/iconInactive32.png"
            },
            tabId: tabID
        })
    }
}

function SetPageColorOverrides(name, tabID) {
    if (enableLogs) { console.log('SetPageColorOverrides()') }
    try {
        const url = chrome.runtime.getURL('styles/' + name + '.ov');
        if (enableLogs) { console.log('Fetching: ' + url) }
        fetch(url)
            .then((response) => response.text()
            .then((value) => {
                /** @type {{key: string;value: string;}[]} */
                var overrides = []

                if (enableLogs) { console.log('Process overrides...') }

                value.split('\n').forEach(line => {
                    if (line.includes('>')) {
                        var left = line.split('>')[0].trim()
                        var right = line.split('>')[1].trim()
                        overrides.push({key: left, value: right})
                    }
                });

                if (enableLogs) { console.log('Apply overrides... (1)') }
                chrome.scripting.executeScript({
                    target: { tabId: tabID },
                    /** @param {{ key: string; value: string; }[]} overrides @param {boolean} enableLogs */
                    function: (overrides, enableLogs) => {
                        if (enableLogs) { console.log('Apply overrides... (2)') }
                        const allInBody = document.querySelectorAll('body *');
                        for (const element of allInBody) {
                            if (element == undefined || element == null) { continue }
                            if (element.hasAttribute('style') == true) {
                                /** @type {string} */
                                var style = element.getAttribute('style')
                                var ovVal = null
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
                    args: [overrides, enableLogs]
                })
                .catch((error) => {
                    if (enableLogs) { console.error(error) }
                })
            }))
            .catch((error) => {
                if (enableLogs) { console.error(error) }
            })
        .catch((error) => {
            if (enableLogs) { console.error(error) }
        })
    } catch (error) {
        if (enableLogs) { console.error(error) }
    }
}

function SetPageGlobalStyle(tabID) {
    try {
        const urlGlobal = chrome.runtime.getURL('styles/global.css');
        if (enableLogs) { console.log('Fetching: ' + urlGlobal) }
        fetch(urlGlobal)
            .then((response) => response.text()
            .then((value) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabID },
                    function: (styleContent) => {
                        var domStyle = document.getElementById('user-global-stylesheet');
                        if (domStyle == null) {
                            domStyle = document.createElement('style')
                            domStyle.id = "user-global-stylesheet";
                        }
                        domStyle.innerHTML = styleContent;
                        document.head.appendChild(domStyle);
                    },
                    args: [value]
                })
                .catch((error) => {
                    if (enableLogs) { console.error(error) }
                })
            }))
            .catch((error) => {
                if (enableLogs) { console.error(error) }
            })
        .catch((error) => {
            if (enableLogs) { console.error(error) }
        })
    } catch (error) {
        if (enableLogs) { console.error(error) }
    }
}

function SetPageStyle(uri, tabID, enableLogs) {
    if (typeof SetBadge !== 'undefined') {
        SetBadge('LOADING', tabID)
    }

    try {
        var domain = new URL(uri).hostname
        const url = chrome.runtime.getURL('styles/' + domain + '.css');
        if (enableLogs) { console.log('Fetching: ' + url) }
        fetch(url)
            .then((response) => response.text().then((value) => {
                SetPageGlobalStyle(tabID)
                SetPageColorOverrides(domain, tabID)
                chrome.scripting.executeScript({
                    target: { tabId: tabID },
                    function: (styleContent) => {
                        var domStyle = document.getElementById('user-stylesheet');
                        if (domStyle == null) {
                            domStyle = document.createElement('style')
                            domStyle.id = "user-stylesheet";
                        }
                        domStyle.innerHTML = styleContent;
                        document.head.appendChild(domStyle);
                    },
                    args: [value]
                })
                .then((results) => {
                    SetBadge('NONE', tabID)
                    SetIcon('ACTIVE', tabID)
                })
                .catch((error) => {
                    if (enableLogs) { console.error(error) }
                    SetBadge('ERROR', tabID)
                    SetIcon('INACTIVE', tabID)
                })
            }))
            .catch((error) => {
                if (enableLogs) { console.error(error) }
                if (typeof SetBadge !== 'undefined') {
                    SetBadge('NONE', tabID)
                }
                if (typeof SetIcon !== 'undefined') {
                    SetIcon('INACTIVE', tabID)
                }
            })
    } catch (error) {
        if (enableLogs) { console.error(error) }
        SetBadge('ERROR', tabID)
        SetIcon('INACTIVE', tabID)
    }
}