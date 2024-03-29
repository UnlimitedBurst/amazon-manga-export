chrome.runtime.onInstalled.addListener(() => {
  console.info("安装完成");
  chrome.storage.local.set({
    images: null,
    per_img_timeout: 1000,
    slice: 10,
    page_timeout: 1000,
    showUseTip: true,
  });

  chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "knockknock");

    console.debug("service_worker",port)

    port.onMessage.addListener(function (msg) {
      if (msg.progress===100) {
        chrome.action.setIcon({
            path: "/img/icons/download.png",
          });
      }else{
        chrome.action.setIcon({
            path: "/img/icons/download_active.png",
          });
      }
    });
  });
});
