chrome.runtime.onInstalled.addListener(() => {
    console.info("安装完成")
    chrome.storage.local.set({images:null,per_img_timeout:4000,slice:10,page_timeout:1000,showUseTip:true})

})

