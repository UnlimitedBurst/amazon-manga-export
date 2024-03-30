function init() {
  const tipModal = document.createElement("div");
  tipModal.setAttribute(
    "style",
    `display: flex;
        align-items: center;
        justify-content: center;
        position: fixed;
        z-index: 1000;
        top: 0;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);`
  );
  tipModal.onclick = () => {
    tipModal.remove();
  };

  return tipModal;
}

function showModal(popover, content) {
  const tipModal = init();

  tipModal.innerHTML = `<div style="width: 40%; background: white;padding:10px;border-radius:10px">
  <h3 style="text-align:center">提示信息</h3>
  <p style="font-size: 20px">${content}</p>
</div>
`;

  tipModal.querySelector("div").onclick=e=>{
     e.stopPropagation()
  }

  popover.append(tipModal);
}

function showOptionModal(
  popover,
  { content, confirm = "确认", cancel = "取消" }
) {
  return new Promise((resolve) => {
    const tipModal = init();
    tipModal.innerHTML = `<div style="width: 40%; background: white;padding:10px;border-radius:10px">
  <h3 style="text-align:center">提示信息</h3>
  <p style="font-size: 20px">${content}</p>
  <div class="confirm">${confirm}</div>
  <div class="cancel">${cancel}</div>
</div>
`;
    tipModal.querySelector(".confirm").onclick = () => {
      resolve(true);
    };

    tipModal.querySelector(".cancel").onclick = () => {
      resolve(false);
    };

    tipModal.querySelector("div").onclick=e=>{
       e.stopPropagation()
    }

    popover.append(tipModal);
  });
}

// 帮助弹窗
function showFirstTipModal(popover, showUseTip, callback) {
  const tipModal = init();

  const imgPath = chrome.runtime.getURL("img/icons/download.png");

  tipModal.innerHTML = `<div style="width: 40%; background: white;padding:10px;border-radius:10px">
        <h3 style="text-align:center">使用帮助</h3>
        <p style="font-size: 20px">扩展程序使用方法：右击漫画封面或标题作者，选择【导出漫画】。导出时间依漫画页数、图片大小而定，一般150-200张图片之间大概要花费4分钟左右。</p>
        <p style="font-size: 20px">注意事项：</p>
        <ol style="font-size: 20px;text-align:left">
          <li>脚本注入到漫画列表页面上下文，如果刷新或关闭页面，脚本就会终止运行。</li>
          <li>脚本导出漫画中，不建议新建标签页查看漫画，会增加被ban的风险。</li>
          <li>虽然理论上可以同时导出多部漫画，但是会增加被ban的风险。</li>
          <li>当前使用帮助可在扩展程序图标<img src="${imgPath}"></img>里的弹出式窗口打开，另外面板配置仅供开发调试用，不建议普通用户修改。</li>
        </ol>
        <hr/>
        
        <hr/>
        <div
          class="btn"
          style="
            font-size: 18px;
            background: gray;
            width: 100px;
            border-radius: 10px;
            margin: 10px auto;
            padding: 4px 4px;
            color: white;
            cursor: pointer;
          "
        >
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

  tipModal.querySelector("div").onclick=e=>{
    e.stopPropagation()
  }

  popover.append(tipModal);
}
