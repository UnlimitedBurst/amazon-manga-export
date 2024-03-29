chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "knockknock");

    console.debug("popup",port)
    
    port.onMessage.addListener(function (msg) {
        console.debug(msg)
      });
  });

function changeRadio(e) {
  const ele = document.querySelector("#pageSize");
  if (e.target.value === "1") {
    ele.parentElement.classList.replace("d-inline", "d-none");
    chrome.storage.local.set({ images: null });
  } else {
    ele.parentElement.classList.replace("d-none", "d-inline");
  }
}

async function changeValue(ele, key) {
  ele.onkeyup = ele.onchange = async (e) => {
    await chrome.storage.local.set({
      [key]: +e.target.value > 0 ? +e.target.value : null,
    });
    console.info("值更新", +e.target.value);
  };
}

onload = () => {
  Array.from(document.querySelectorAll('input[type="radio"]')).forEach(
    (ele) => {
      ele.onclick = changeRadio;
    }
  );

  const pageSize = document.querySelector("#pageSize");

  changeValue(pageSize, "images");

  chrome.storage.local.get(["images"]).then(({ images }) => {
    console.info("images", images);

    if (+images > 0) {
      pageSize.style.display = "";
      document.querySelector('[value="2"]').click();
    }
  });

  const per_img_timeout_ele = document.querySelector("#per_img_timeout");

  const slice_ele = document.querySelector("#slice");

  const page_timeout_ele = document.querySelector("#page_timeout");

  changeValue(per_img_timeout_ele, "per_img_timeout");

  changeValue(slice_ele, "slice");

  changeValue(page_timeout_ele, "page_timeout");

  chrome.storage.local.get(["per_img_timeout","slice","page_timeout"]).then(({per_img_timeout,slice,page_timeout})=>{
        console.info("per_img_timeout",per_img_timeout,"slice",slice,"page_timeout",page_timeout)

        if((+per_img_timeout)>=0){
            per_img_timeout_ele.value=+per_img_timeout
        }

        if((+slice)>0){
            slice_ele.value=+slice
        }

        if((+page_timeout)>=0){
            page_timeout_ele.value=+page_timeout
        }
    })

  document.querySelector("#close").onclick = () => {
    top.close();
  };
  document.querySelector("#reset").onclick = () => {
    const initValue = {
      images: null,
      per_img_timeout: 4000,
      slice: 10,
      page_timeout: 1000,
      showUseTip: true,
    };
    chrome.storage.local.set(initValue);

    const { images, per_img_timeout, slice, page_timeout } = initValue;

    pageSize.value = images;

    document.querySelector(`[value="${pageSize.value > 0 ? 2 : 1}"]`).click();

    per_img_timeout_ele.value = per_img_timeout;
    slice_ele.value = slice;
    page_timeout_ele.value = page_timeout;
  };

  document.querySelector("#help").onclick = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    
    const port=chrome.tabs.connect(tab.id);
    console.info(port)
    port.postMessage({ showHelp: true });
    
  };
};
