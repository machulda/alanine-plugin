let serverAddress;
let IP;
let notificationsEnabled;
const missedMessagesArr = [];

let state = {
    blockingEnabled: true,
    loggingEnabled: true,
    connected: false,
    version: ""
};

function ipToUrl(ip, port) {

    return "http://" + ip + ":" + port;
}

async function getSavedPreferences() {
    let newIPItem = await browser.storage.local.get('ip') || "192.168.1.0";
    let newPortItem = await browser.storage.local.get('port') || "8221";

    serverAddress = ipToUrl(newIPItem.ip, newPortItem.port);
    IP = newIPItem.ip;
    notificationsEnabled = await browser.storage.local.get("notifications_enabled") || false;
}

function processChangedPreferences(newIP, newPort, newNotificationsEnabled) {
    console.debug("IP changed to " + newIP);
    console.debug("Port changed to " + newPort);
    console.debug("Notifications are  " + newPort);
    serverAddress = ipToUrl(newIP, newPort);
    IP = newIP;
    notificationsEnabled = newNotificationsEnabled;

    checkHeartbeat();
}

function isPopupOpen() {
    const views = browser.extension.getViews({type: "popup"});


    return Array.isArray(views) && views.length !== 0;
}

function changeIconToAlert() {
    browser.browserAction.setIcon(
        {path: "../icons/LogoNotify48px.png"}
    );
}

/// todo change - see popup counterpart
function sendToPopUp(message) {
    if (isPopupOpen()) {
        browser.runtime.sendMessage(message).catch((e) => {
            console.debug("popup was closed while sending message", message);
            console.error(e);
        })
    } else if (message.type === "user-message") {
        // todo
        console.debug("Adding message to queue");
        missedMessagesArr.unshift(message);

        changeIconToAlert();
        if (notificationsEnabled) {
            browser.notifications.create({
                "type": "basic",
                "iconUrl": browser.extension.getURL("icons/Logo96px.png"),
                "title": "Alanine",
                "message": message.load
            });
        }
    }
}

/**
 * If is online set state to offline and send state to pop-up
 */
function goOffline() {
    state.connected = false;
    sendStateToPopup();
}

/**
 *  * If is offline set state to online, send state to pop-up and get new state - only to be used from heartbeat func.
 */
function goOnline() {
    if (!state.connected) {
        state.connected = true;
        getNewState();
    }
}

async function getVersion() {
    let resp, message;
    try {
        resp = await fetch(serverAddress + "/alanine/version", {method: "GET"});
        message = await resp.json();
    } catch (e) {
        console.error("error while fetching version " + e);
        checkHeartbeat();
        return;
    }


    if (resp.status === 200) {
        state.version = message.message === undefined ? "" : message.message.replaceAll("\n", "<br>");
        sendStateToPopup();

    } else {
        console.error("error status while getting state");
        sendToPopUp({type: "user-message", load: message.message, level: "error"});
    }

}

async function getNewState() {
    if (!state.connected) {
        return;
    }
    let resp, message;
    try {
        resp = await fetch(serverAddress + "/alanine/status", {method: "GET"});
        message = await resp.json();
    } catch (e) {
        console.error("error while fetching state " + e);
        checkHeartbeat();
        return;
    }
    if (resp.status === 200) {
        state.blockingEnabled = message.isBlockingEnabled;
        state.loggingEnabled = message.isLoggingEnabled;
        state.connected = true;
        sendStateToPopup()
    } else {
        console.error("error status while getting state");
        sendToPopUp({type: "user-message", load: message.message, level: "error"});
    }

    getVersion();


}

async function enableBlocking() {
    state.blockingEnabled = true;
    let resp, message;
    try {
        resp = await fetch(serverAddress + "/alanine/enable", {method: "PUT"});
        message = await resp.json();

    } catch (e) {
        console.error("error in enable blocking");
        console.error(e);
        state.blockingEnabled = false;
        await getNewState();
        return;
    }
    /// all good
    if (resp.status === 200) {
        sendToPopUp({type: "user-message", load: message.message, level: "info"})
    } else if (resp.status === 409) {
        /// already enabled
        console.error("already enabled");
        sendToPopUp({type: "user-message", load: message.message, level: "warning"})
    } else {
        /// some error

        state.blockingEnabled = message.isSuccessful || false;
        sendToPopUp({type: "user-message", load: message.message, level: "error"});

        getNewState();
    }

}

async function disableBlocking(time) {
    state.blockingEnabled = false;
    let resp, message;

    try {
        if (time && time !== "0") {
            resp = await fetch(serverAddress + "/alanine/disable?unit=m&time=" + time, {method: "PUT"});
            setTimeout(getNewState, Number(time) * 1000 * 60);
        } else {
            resp = await fetch(serverAddress + "/alanine/disable", {method: "PUT"});
        }
        message = await resp.json();
    } catch (e) {
        console.error("error in disable fetch");
        console.error(e);
        state.blockingEnabled = true;
        await getNewState();
        return;
    }
    /// all good
    if (resp.status === 200) {
        state.blockingEnabled = false;
        sendToPopUp({type: "user-message", load: message.message, level: "info"})
    } else if (resp.status === 409) {
        /// already disabled
        state.blockingEnabled = false;

        console.error("already disabled");
        sendToPopUp({type: "user-message", load: message.message, level: "warning"})
    } else {
        /// some error
        state.blockingEnabled = !message.isSuccessful || true;
        sendToPopUp({type: "user-message", load: message.message, level: "error"});

        getNewState();
    }

}

async function enableLogging() {
    state.loggingEnabled = true;
    let resp, message;
    try {
        resp = await fetch(serverAddress + "/alanine/log/enable", {method: "PUT"});
        message = await resp.json();

    } catch (e) {
        console.error("error in enable fetch or parsing");
        console.error(e);
        state.loggingEnabled = false;
        await getNewState();
        return;
    }
    /// all good
    if (resp.status === 200) {
        sendToPopUp({type: "user-message", load: message.message, level: "info"})
    } else {
        /// some error

        state.loggingEnabled = message.isSuccessful || false;
        sendToPopUp({type: "user-message", load: message.message, level: "error"});
        getNewState();
    }

}

async function disableLogging(time) {
    state.loggingEnabled = false;
    let resp, message;

    try {
        if (time && time !== "0") {
            resp = await fetch(serverAddress + "/alanine/log/disable?time=" + time, {method: "PUT"});
            /// server checks every minute if it's time for logging enable so we to wait a little longer
            setTimeout(getNewState, (Number(time) + 2) * 1000 * 60);
        } else {
            resp = await fetch(serverAddress + "/alanine/log/disable", {method: "PUT"});
        }
        message = await resp.json();
    } catch (e) {
        console.error("error in disable logging fetch");
        console.error(e);
        state.loggingEnabled = true;
        await getNewState();
        return;
    }
    /// all good
    if (resp.status === 200) {
        state.loggingEnabled = false;
        sendToPopUp({type: "user-message", load: message.message, level: "info"})
    } else {
        /// some error
        state.loggingEnabled = !message.isSuccessful || true;
        sendToPopUp({type: "user-message", load: message.message, level: "error"});

        getNewState();
    }

}

async function reload() {
    let resp, message;
    try {
        resp = await fetch(serverAddress + "/alanine/dns/restart", {method: "PUT"});
        message = await resp.json();
    } catch (e) {
        console.error("error in reload fetch");
        console.error(e);
        return;
    }

    if (resp.status === 200) {
        sendToPopUp({type: "user-message", load: message.message, level: "info"})
    } else {
        console.error("error status while reloading DNS");
        sendToPopUp({type: "user-message", load: message.message, level: "error"});
        getNewState()
    }
}

async function updateGravity() {
    let resp, message;
    try {
        resp = await fetch(serverAddress + "/alanine/gravity/update", {method: "PUT"});

        message = await resp.json();

    } catch (e) {
        console.error("error in gravity reload fetch");
        console.error(e);
        return;
    }
    if (resp.status === 200) {
        sendToPopUp({type: "user-message", load: message.message, level: "info"})
    } else {
        console.error("error status while updating gravity");
        sendToPopUp({type: "user-message", load: message.message, level: "error"});
        getNewState();
    }

}

async function blacklist(payloadObject) {
    let resp, message, url;
    if (payloadObject.name === null || payloadObject.name === "") {
        sendToPopUp({
            type: "user-message",
            load: "invalid domain name",
            level: "error"
        });
        return;
    }


    switch (payloadObject.type) {
        case "exact":
            url = "/blacklist";
            break;
        case "regex":
            url = "/blacklist/regex";
            break;
        case "wildcard":
            url = "/blacklist/wildcard";
            break;
        default:
            console.error("error - unknown type of blocking type - got " + payloadObject.type);
            sendToPopUp({
                type: "user-message",
                load: "internal plugin error, unknown type of blacklist type (expected wildcard, regex or exact), got " + payloadObject.type,
                level: "error"
            });
            return;
    }


    try {
        resp = await fetch(serverAddress + "/alanine" + url + "?domain=" + encodeURIComponent(payloadObject.name), {method: "PUT"});
        message = await resp.json();
    } catch (e) {
        console.error("error in adding domain to blacklist");
        console.error(e);
        return;
    }
    if (resp.status === 200) {
        state.blockingEnabled = false;
        sendToPopUp({type: "user-message", load: message.message, level: "info"})

    } else if (resp.status === 409) {
        /// already in blacklist
        console.error("already in blacklist");
        sendToPopUp({type: "user-message", load: message.message, level: "warning"})

    } else if (resp.status === 404) {
        /// invalid domain name
        console.error("invalid domain name ");
        sendToPopUp({type: "user-message", load: message.message, level: "warning"})
    } else {
        /// some error
        sendToPopUp({type: "user-message", load: message.message, level: "error"});
        getNewState();
    }
}

async function whitelist(payloadObject) {
    let resp, message, url;
    if (payloadObject.name === null || payloadObject.name === "") {
        sendToPopUp({
            type: "user-message",
            load: "invalid domain name",
            level: "error"
        });
        return;
    }

    switch (payloadObject.type) {
        case "exact":
            url = "/whitelist";
            break;
        case "regex":
            url = "/whitelist/regex";
            break;
        case "wildcard":
            url = "/whitelist/wildcard";
            break;
        default:
            console.error("error - unknown type of blocking type - got " + payloadObject.type);
            sendToPopUp({
                type: "user-message",
                load: "internal plugin error, unknown type of whitelist type (expected wildcard, regex or exact), got " + payloadObject.type,
                level: "error"
            });
            return;
    }

    try {
        resp = await fetch(serverAddress + "/alanine" + url + "?domain=" + encodeURIComponent(payloadObject.name), {method: "PUT"});

        message = await resp.json();

    } catch (e) {
        console.error("error in adding domain to whitelist");
        console.error(e);
        return;
    }
    if (resp.status === 200) {
        state.blockingEnabled = false;
        sendToPopUp({type: "user-message", load: message.message, level: "info"})

    } else if (resp.status === 409) {
        /// already in whitelist
        console.error("already in whitelist");
        sendToPopUp({type: "user-message", load: message.message, level: "warning"})

    } else if (resp.status === 404) {
        /// invalid domain name
        console.error("invalid domain name ");
        sendToPopUp({type: "user-message", load: message.message, level: "warning"})
    } else {
        /// some error
        sendToPopUp({type: "user-message", load: message.message, level: "error"});
        getNewState();
    }
}

function checkHeartbeat() {

    return fetch(serverAddress + "/alanine", {method: "HEAD"}).then((response) => {
        response.status === 200 ? goOnline() : goOffline();
    }).catch(e => {
        console.error(e);
        console.info("HB failed");
        goOffline()
    });
}

function sendStateToPopup() {
    sendToPopUp({type: "state", load: state});
}

function checkIfOnline() {
    if (isPopupOpen()) {
        checkHeartbeat();
        setTimeout(checkIfOnline, 5000);
    }
}


function popUpIsOpened() {
    setTimeout(checkIfOnline, 5000);

    checkHeartbeat().then(() => {
        getNewState();

        if (state.connected) {
            if (isPopupOpen()) {
                while (missedMessagesArr.length) {
                    browser.runtime.sendMessage(missedMessagesArr.pop()).catch((e) => {
                        console.error(e);
                    })
                }
            }
        }
    })
}

function handleMessage(request, sender, sendResponse) {
    switch (request.type) {
        case "hello":
            popUpIsOpened();
            break;
        case "disable-blocking":
            disableBlocking(request.payload.time);
            break;
        case "enable-blocking":
            enableBlocking();
            break;
        case "reload":
            reload();
            break;
        case "update-gravity":
            updateGravity();
            break;
        case "blacklist":
            blacklist(request.payload);
            break;
        case "whitelist":
            whitelist(request.payload);
            break;
        case "change-preferences":
            processChangedPreferences(request.payload.ip, request.payload.port, request.payload.notificationsEnabled);
            break;
        case "enable-logging":
            enableLogging();
            break;
        case "disable-logging":
            disableLogging(request.payload.time);
            break;
        case "get-ip":
            return Promise.resolve({response: IP});
        default:
            console.error("unknown type " + request.type);
            return Promise.reject({state: "invalid type"})
    }
}

/// we chain it because we  get IP async
getSavedPreferences().then(checkHeartbeat);


browser.runtime.onMessage.addListener(handleMessage);