const enableBlockingCheckbox = document.querySelector("#status");
const enableLoggingCheckbox = document.querySelector("#logging-status");

const blockingSlider = document.querySelector("#blocking-slider");
const loggingSlider = document.querySelector("#logging-slider");

const blockingSliderValue = document.querySelector("#blocking-time-value");
const loggingSliderValue = document.querySelector("#logging-time-value");

const blockingSliderWrapper = document.querySelector("#blocking-slider-wrapper");
const loggingSliderWrapper = document.querySelector("#logging-slider-wrapper");


const versionParagraph = document.querySelector("#version");
const dnsReloadButton = document.querySelector("#dns-reload");
const gravityUpdateButton = document.querySelector("#gravity-update");
const infobox = document.querySelector("#message-box");
/// add domain to black/white list selectors

const addDomainButton = document.querySelector("#add-domain");
const cancelAddDomain = document.querySelector("#cancel-add-domain");
const domainform = document.querySelector("#domain-form");
const submitWhitelist = document.querySelector("#submit-whitelist");
const submitBlacklist = document.querySelector("#submit-blacklist");


const domainInput = document.querySelector("#domain-input");
const popupControls = document.querySelector("#popup-controls");

const offlineDialog = document.querySelector("#offline-dialog");

const spinner = document.getElementById("spinner");

const openPiholeAdmin = document.querySelector("#open-admin");
const openSettings = document.querySelector("#open-settings");

const indefinitelySliderHtml = "<strong>indefinitely</strong>";

let state = {};
/// msg - {id, ttl,message}
let messageArray = [];


/**
 * remove loading visual
 */
function removeLoadingVisual() {
    spinner.classList.remove("spinner");
    popupControls.classList.remove("loading");
}

const processState = (newState) => {
    /// if state didn't change, there is no need for update
    if (newState === state) {
        return;
    }
/// we are opening popup with "loading visual" active (blurry grey background + spinner). so after we get state we can remove this visual.
    removeLoadingVisual();

    /// change
    if (!newState.connected) {
        offlineDialog.classList.remove("hidden");
        domainform.classList.add("hidden");
        popupControls.classList.add("hidden")
    } else {
        offlineDialog.classList.add("hidden");
        /// we want to hide everything except controls, so we can return to base state
        domainform.classList.add("hidden");
        popupControls.classList.remove("hidden");
    }
    enableBlockingCheckbox.checked = newState.blockingEnabled;
    enableLoggingCheckbox.checked = newState.loggingEnabled;

    if (newState.blockingEnabled) {
        blockingSliderWrapper.classList.remove("hidden");
    } else {
        blockingSliderWrapper.classList.add("hidden")
    }

    if (newState.loggingEnabled) {
        loggingSliderWrapper.classList.remove("hidden");
    } else {
        loggingSliderWrapper.classList.add("hidden")
    }

    versionParagraph.innerHTML = newState.version;


    state = newState;

};

const sayHelloToBackground = () => {
    browser.runtime.sendMessage({type: "hello"});
};

//// TODO: throws icon invalid, but works fine - seems like icon is wrongly sized, but it doesn't matter since we won't use this one.
function changeIconToDefault() {
    browser.browserAction.setIcon(
        {path: "../icons/Logo48px.png"}
    ).catch(e => console.log("error " + e.message + " while loading default icon"));
}

const disableBlocking = () => {
    state.blockingEnabled = false;
    blockingSliderWrapper.classList.add("hidden");

    browser.runtime.sendMessage({
        type: 'disable-blocking',
        payload: {time: blockingSlider.value}
    }).catch((e) => console.error(e));
    blockingSlider.value = 0;
    blockingSliderValue.innerHTML = indefinitelySliderHtml;
};

const enableBlocking = () => {
    state.blockingEnabled = true;
    blockingSliderWrapper.classList.remove("hidden");
    browser.runtime.sendMessage({type: 'enable-blocking'}).catch((e) => console.error(e));
};
const disableLogging = () => {
    state.loggingEnabled = false;
    loggingSliderWrapper.classList.add("hidden");
    browser.runtime.sendMessage({
        type: 'disable-logging',
        payload: {time: loggingSlider.value}
    }).catch((e) => console.error(e));
    loggingSlider.value = 0;
    loggingSliderValue.innerHTML = indefinitelySliderHtml;

};

const enableLogging = () => {
    state.loggingEnabled = true;
    loggingSliderWrapper.classList.remove("hidden");
    browser.runtime.sendMessage({type: 'enable-logging'}).catch((e) => console.error(e));
};


function displayUserMessage(message) {
    const id = messageArray.length === 0 ? 0 : messageArray[0].id + 1;

    /// we want to have our most recent message on top
    messageArray.unshift({id: id, ttl: 5, message: message});
    switch (message.level) {
        case "info":
            infobox.innerHTML = `<p class="${message.level}" id="message-${id}"> <i class="fas fa-info-circle"></i> ${message.load}</p>` + infobox.innerHTML;
            break;
        case "warning":
            infobox.innerHTML = `<p class="warning" id="message-${id}"> <i class="fas fa-exclamation-triangle"></i>${message.load}</p>` + infobox.innerHTML;
            break;
        case "error":
            infobox.innerHTML = `<p class="error" id="message-${id}"><i class="fas fa-times"></i> ${message.load}</p>` + infobox.innerHTML;
            break;
    }

}


function messageCleaner() {
    messageArray = messageArray.filter(function (entry) {
        entry.ttl--;
        if (entry.ttl < 0) {
            document.querySelector("#message-" + entry.id).remove();
            return false;
        } else {
            return true;
        }
    });
}


/// todo change - 2 types - update state or show message to user
browser.runtime.onMessage.addListener(
    // (message) => document.querySelector("#writeable").innerHTML = message
    (message) => {
        if (message.type === "user-message") {
            displayUserMessage(message);
        } else if (message.type === "state") {
            processState(message.load)
        } else {
            console.error("unknown message: ", message)
        }
    }
);

const processDnsBlockingSwitch = (e) => {
    if (enableBlockingCheckbox.checked) {
        enableBlocking();
    } else {
        disableBlocking();
    }
};


function processLoggingSwitch(e) {

    if (enableLoggingCheckbox.checked) {
        enableLogging();
    } else {
        disableLogging();
    }
}


function processReloadDns() {
    browser.runtime.sendMessage({type: 'reload'}).catch((e) => console.error(e));
}

function processUpdateGravity() {
    browser.runtime.sendMessage({type: 'update-gravity'}).catch((e) => console.error(e));
}

function processAddDomain() {
    popupControls.classList.add("hidden");
    domainform.classList.remove("hidden");

}

function processBlacklistSubmit(e) {
    e.preventDefault();
    const payload = {
        name: domainInput.value,
        type: document.querySelector('input[name="type"]:checked').value
    };
    browser.runtime.sendMessage({type: "blacklist", payload: payload});

    domainform.classList.add("hidden");
    popupControls.classList.remove("hidden");
    domainInput.value = "";
}

function processWhitelistSubmit(e) {
    e.preventDefault();
    const payload = {
        name: domainInput.value,
        type: document.querySelector('input[name="type"]:checked').value
    };

    browser.runtime.sendMessage({type: "whitelist", payload: payload});
    domainform.classList.add("hidden");
    popupControls.classList.remove("hidden");
    domainInput.value = "";
}

function processCancelAddDomain() {
    domainInput.value = "";
    domainform.classList.add("hidden");
    popupControls.classList.remove("hidden");
}

function processLoggingSliderValueChange(e) {
    loggingSliderValue.innerHTML = loggingSlider.value !== "0" ? `<strong>${loggingSlider.value}</strong> minutes` : indefinitelySliderHtml;
}

function processBlockingSliderValueChange(e) {
    blockingSliderValue.innerHTML = blockingSlider.value !== "0" ? `<strong>${blockingSlider.value}</strong> minutes` : indefinitelySliderHtml;
}

sayHelloToBackground();

changeIconToDefault();
// document.querySelector("#disable").addEventListener("click", disableWithoutTime);
// // document.querySelector("#").addEventListener("click", disableWithTime);
// document.querySelector("#enable").addEventListener("click", enable);

enableBlockingCheckbox.addEventListener("click", processDnsBlockingSwitch);
enableLoggingCheckbox.addEventListener("click", processLoggingSwitch);

blockingSlider.addEventListener("input", processBlockingSliderValueChange);
loggingSlider.addEventListener("input", processLoggingSliderValueChange);

dnsReloadButton.addEventListener("click", processReloadDns);
gravityUpdateButton.addEventListener("click", processUpdateGravity);

addDomainButton.addEventListener("click", processAddDomain);
domainform.addEventListener("submit", (e) => {
    e.preventDefault()
});


submitBlacklist.addEventListener("click", processBlacklistSubmit);
submitWhitelist.addEventListener("click", processWhitelistSubmit);
cancelAddDomain.addEventListener("click", processCancelAddDomain);

openPiholeAdmin.addEventListener("click", () => {
        browser.runtime.sendMessage({type: "get-ip"}).then((message) => {
            browser.tabs.create({url: "http://" + message.response + "/admin"})
        })
    }
);

openSettings.addEventListener("click", () => {
    browser.runtime.openOptionsPage()
});

setInterval(messageCleaner, 1000);


