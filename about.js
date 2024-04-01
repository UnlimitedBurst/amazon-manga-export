function init(bgremove) {
  const tipModal = document.createElement("div");
  tipModal.classList.add("modal")
  if(bgremove){
    tipModal.onclick = () => {
      tipModal.remove();
    };
  }

  return tipModal;
}

function showModal(popover, content) {
  const tipModal = init(true);

  tipModal.innerHTML = `<div class="content">
  <h3 >提示信息</h3>
  <p >${content}</p>
</div>
`;

  tipModal.querySelector(".content").onclick=e=>{
     e.stopPropagation()
  }

  popover.append(tipModal);
}

function showAutoCloseTip(popover,content,timeout=3000){
  const tipModal = init(true);

  if(timeout<1000){
    timeout=1000
  }

  tipModal.innerHTML = `<div class="content">
  <h3 >提示信息</h3>
  <p >${content}</p>
  <p>${timeout/1000}秒后自动消失</p>
</div>
`;


  setTimeout(()=>{
    tipModal.classList.add("fadeOut")
  },timeout-900)

  setTimeout(()=>{
    tipModal.click()
  },timeout)



  popover.append(tipModal);

}

// 显示弹窗
function showOptionModal(
  popover,
  { content, confirm = "确认", cancel = "取消" }
) {
  return new Promise((resolve) => {
    const tipModal = init(false);
    tipModal.innerHTML = `<div class="content">
  <h3 >提示信息</h3>
  <p >${content}</p>
  <div class="confirm">${confirm}</div>
  <div class="cancel">${cancel}</div>
</div>
`;
    tipModal.querySelector(".confirm").onclick = () => {
      tipModal.remove();
      resolve(true);
    };

    tipModal.querySelector(".cancel").onclick = () => {
      tipModal.remove();
      resolve(false);
    };

    tipModal.querySelector(".content").onclick=e=>{
       e.stopPropagation()
    }

    popover.append(tipModal);
  });
}

// 帮助弹窗
function showFirstTipModal(popover, showUseTip, callback) {
  const tipModal = init(true);

  const imgPath = chrome.runtime.getURL("img/icons/download.png");

  tipModal.innerHTML = `<div class="content">
        <h3 >使用帮助</h3>
        <p >扩展程序使用方法：右击漫画封面或标题作者，选择【导出漫画】。导出时间依漫画页数、图片大小而定，一般150-200张图片之间大概要花费4分钟左右。</p>
        <p >注意事项：</p>
        <ol>
          <li>脚本注入到漫画列表页面上下文，如果刷新或关闭页面，脚本就会终止运行。</li>
          <li>脚本导出漫画中，不建议新建标签页查看漫画，会增加被ban的风险。</li>
          <li>虽然理论上可以同时导出多部漫画，但是会增加被ban的风险。</li>
          <li>当前使用帮助可在扩展程序图标<img src="${imgPath}"></img>里的弹出式窗口打开，另外面板配置仅供开发调试用，不建议普通用户修改。</li>
        </ol>
        <hr/>
        <div
          class="btn">
          不再提示
        </div>
      </div>
      `;

  const btn = tipModal.querySelector(".btn");
  if (showUseTip) {
    btn.onclick = async () => {
      tipModal.remove();
      callback && (await callback());
    };
  } else {
    btn.remove();
  }

  tipModal.querySelector(".content").onclick=e=>{
    e.stopPropagation()
  }

  popover.append(tipModal);
}
