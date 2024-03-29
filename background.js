chrome.runtime.onInstalled.addListener(() => {
  console.info("安装完成");
  chrome.storage.local.set({
    images: null,
    per_img_timeout: 3500,
    slice: 10,
    page_timeout: 1000,
    showUseTip: true,
  });

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.start) {
      chrome.action.setIcon({
        path: "/img/icons/download_active.png",
      });
    }
    if (request.done) {
      chrome.action.setIcon({
        path: "/img/icons/download.png",
      });
    }

    
  });
});
