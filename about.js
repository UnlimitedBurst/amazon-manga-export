// 帮助弹窗
function showFirstTipModal(popover,showUseTip,callback){
    const tipModal=document.createElement('div')
        tipModal.setAttribute('style',`display: flex;
        align-items: center;
        justify-content: center;
        position: fixed;
        z-index: 1000;
        top: 0;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);`)

        tipModal.innerHTML=`<div style="width: 40%; background: white">
        <h3>使用帮助</h3>
        <p style="font-size: 20px">扩展程序使用方法：右击漫画封面-选择导出漫画。这条提示信息可以在扩展程序弹窗里打开</p>
        <div
          class="btn"
          style="
            font-size: 18px;
            background: gray;
            width: 100px;
            border-radius: 10px;
            margin: auto;
            margin-bottom: 10px;
            padding: 4px 4px;
            color: white;
            cursor: pointer;
          "
        >
          不再显示
        </div>
      </div>
      `

      const btn=tipModal.querySelector(".btn")
      if(showUseTip){
        btn.onclick=()=>{
          tipModal.remove()
          callback&&callback()
        }
      }else{
        btn.remove()
      }

       tipModal.onclick=()=>{
        tipModal.remove()
       }

  
    
       popover.append(tipModal)
}