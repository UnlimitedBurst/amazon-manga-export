chrome.runtime.onInstalled.addListener(() => {
  console.info("安装完成");
  chrome.storage.local.set({
    images: null,
    per_img_timeout: 0,
    slice: 10,
    page_timeout: 0,
    showUseTip: true
  });
  
});

chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "knockknock");

    console.debug("service_worker",port)

    port.onMessage.addListener(function (msg) {
      console.debug(msg)
      if(msg.icon){
        chrome.action.setIcon({
          path: msg.icon,
        });
      }
      if(msg.msg==="hello"){
        port.postMessage({msg:"hi"})
      }
    });
  });