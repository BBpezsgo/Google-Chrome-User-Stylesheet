'use strict'

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url.startsWith("chrome")) {
        SetPageStyle(tab.url, tab.id)
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: SetPageStyle,
            args: [tab.url, tab.id]
        })
    }
})

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    if (!tab.url.startsWith("chrome")) {
        SetPageStyle(tab.url, tab.id)
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: SetPageStyle,
            args: [tab.url, tab.id]
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

function SetPageStyle(uri, tabID) {
    SetBadge('LOADING', tabID)

    try {
        var domain = new URL(uri).hostname
        const url = chrome.runtime.getURL('styles/' + domain + '.css');
        fetch(url)
            .then((response) => console.log(response.text().then((value) => {
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
                    console.error(error)
                    SetBadge('ERROR', tabID)
                    SetIcon('INACTIVE', tabID)
                })
            })))
            .catch((error) => {
                console.error(error)
                SetBadge('NONE', tabID)
                SetIcon('INACTIVE', tabID)
            })
    } catch (error) {
        console.error(error)
        SetBadge('ERROR', tabID)
        SetIcon('INACTIVE', tabID)
    }
}