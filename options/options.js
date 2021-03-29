function saveOptions(e) {
    const newIP = document.querySelector("#ip").value;
    const newPort = document.querySelector("#port").value;
    const notificationsEnabled = document.querySelector("#notifications-checkbox").checked;


    browser.storage.local.set({
        ip: newIP,
        port: newPort,
        notifications_enabled: notificationsEnabled
    });
    console.debug("saving new options");
    browser.runtime.sendMessage({
        type: 'change-preferences',
        payload: {ip: newIP, port: newPort, notificationsEnabled: notificationsEnabled}
    });

    e.preventDefault();
}

function restoreOptions() {
    const ipAdressItem = browser.storage.local.get('ip');
    const portItem = browser.storage.local.get('port');
    const notificationsEnabled = browser.storage.local.get("notifications_enabled");
    ipAdressItem.then((res) => {
        document.querySelector("#ip").value = res.ip || "192.168.1.0";
    });
    portItem.then((res) => {
        document.querySelector("#port").value = res.port || "8221";
    });

    notificationsEnabled.then((res) => {
        document.querySelector("#notifications-checkbox").checked = res.notifications_enabled || false;
    })
}

restoreOptions();
document.querySelector("#options-form").addEventListener("submit", saveOptions);