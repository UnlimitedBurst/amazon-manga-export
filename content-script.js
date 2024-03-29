let popover;

let itemViewResponse;

let side_bar_filters;

let popoverObserver;

let comic_menu;

// 观察器的配置（需要观察什么变动）
const config = { childList: true };

// 选中的漫画封面id
let currentBook;

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async function (msg) {
    if (msg.showHelp) {
      showFirstTipModal(popover, false);
    }
  });
});

let port;

// 等待
function sleep(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

function createConnect() {
  port = chrome.runtime.connect({ name: "knockknock" });

}

createConnect();

console.debug("content-script port", port);

const manga_id_regex = /(?<=library\-item\-option\-)\w+/;
function rightMenuEvent(e) {
  let target = e.currentTarget || e.target;

  currentBook = manga_id_regex.exec(target.id)[0];
  console.debug(`选中`, currentBook);
}

function changeRightMenu(ele) {
  ele.addEventListener("contextmenu", rightMenuEvent);
}

function base64StringToArrayBuffer(e) {
  const n = atob(e),
    i = new Uint8Array(n.length);
  for (let e = 0; e < n.length; e++) {
    i[e] = n.charCodeAt(e);
  }
  return i.buffer;
}

class o extends Error {
  constructor() {
    super("Invalid rendering token");
  }
}

function getKey(e) {
  if (e.token.length < 100) throw new o();
  const n = e.expiresAt % 60;
  return e.token.substring(n, n + 40);
}

// 图片解密函数
async function decrypt(e, t) {
  const r = new TextDecoder("utf-8"),
    i = new TextEncoder(),
    a = r.decode(e),
    s = a.slice(0, 24),
    l = a.slice(24, 48),
    c = a.slice(48, a.length),
    u = base64StringToArrayBuffer(s),
    d = base64StringToArrayBuffer(l),
    h = base64StringToArrayBuffer(c),
    f = getKey(t),
    p = await window.crypto.subtle.importKey(
      "raw",
      i.encode(f),
      {
        name: "PBKDF2",
      },
      !1,
      ["deriveBits", "deriveKey"]
    ),
    m = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: u,
        iterations: 1e3,
        hash: "SHA-256",
      },
      p,
      {
        name: "AES-GCM",
        length: 128,
      },
      !1,
      ["decrypt"]
    );
  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: d,
      additionalData: i.encode(f.slice(0, 9)),
      tagLength: 128,
    },
    m,
    h
  );
}
// 解析render tar包数据
class DecompressTar {
  constructor(e) {
    (this.entries = new Map()),
      (this.view = new Uint8Array(e)),
      (this.buffer = e);
  }
  init() {
    let i = 512;
    let e = 0,
      t = 0,
      n = "",
      r = null;
    for (
      ;
      e < this.view.byteLength - 512 &&
      ((n = this.readFileName(e)), 0 != n.length);

    ) {
      (r = this.readFileType(e)), (t = this.readFileSize(e));
      let o = {
        name: n,
        type: r,
        size: t,
        headerOffset: e,
      };
      this.entries.set(n, o),
        (e += i + i * Math.trunc(t / i)),
        t % i && (e += i);
    }
  }
  getEntries() {
    return this.entries;
  }
  readString(e, t) {
    let n = 0,
      r = "";
    for (; 0 != this.view[e + n] && n < t; )
      (r += String.fromCharCode(this.view[e + n])), n++;
    return r;
  }
  readFileName(e) {
    return this.readString(e + 0, 100);
  }
  readFileType(e) {
    let t = String.fromCharCode(this.view[e + 156]);
    return "0" === t ? "file" : "5" === t ? "directory" : t;
  }
  readFileSize(e) {
    let t = "";
    for (let n = 0; n < 12; n++)
      t += String.fromCharCode(this.view[e + 124 + n]);
    return parseInt(t, 8);
  }
  readFileBlob(e, t) {
    let n = new Uint8Array(this.buffer, e, t);
    return new Blob([n]);
  }
  readTextFile(e, t) {
    let n = this.buffer.slice(e, e + t);
    return new TextDecoder().decode(n);
  }
  getText(e) {
    const t = this.entries.get(e);
    if (t) return this.readTextFile(t.headerOffset + 512, t.size);
    throw Error(`Unable to find entry ${e}`);
  }
  getBlob(e) {
    const t = this.entries.get(e);
    if (t) return this.readFileBlob(t.headerOffset + 512, t.size);
    throw Error(`Unable to find entry ${e}`);
  }
}
// 解析render tar包数据
class RenderData {
  constructor(e, r) {
    (this.karamelToken = r), (this.ASSETS_DIR = "assets/");
    (this.pages = new Map()),
      (this.layoutPages = new Map()),
      (this.images = new Map()),
      (this.tokens = new Map()),
      (this.panels = new Map()),
      (this.reader = new DecompressTar(e)),
      this.reader.init();
    this.reader.getEntries().forEach(async (e) => {
      const t = e.name;
      if (
        t.startsWith("img_") ||
        t.startsWith(this.ASSETS_DIR) ||
        t.startsWith("rsrc") ||
        t.endsWith(".png")
      ) {
        await this.addImage(e);
      } else if (t.startsWith("page_")) {
        this.addPage(e);
      } else if (t.startsWith("layout_data_")) {
        this.addLayoutPage(e);
      } else if (t.startsWith("tokens_")) {
        this.addTokens(e);
      } else if (t.startsWith("panels_")) {
        this.addPanels(e);
      } else if (t === "glyphs.json") {
        this.addGlyphs(e);
      } else if (t === "toc.json") {
        this.addTableOfContent(e);
      } else if (t === "metadata.json") {
        this.addMetadata(e);
      } else if (t === "manifest.json") {
        this.addManifest(e);
      } else if (t === "location_map.json") {
        this.addLocationMap(e);
      }
    });
  }
  getType() {
    return "TAR";
  }
  addLocationMap(e) {
    e = this.reader.getText(e.name);
    this.locationMap = JSON.parse(e);
  }

  addManifest(e) {
    e = this.reader.getText(e.name);
    this.manifest = JSON.parse(e);
  }
  async addImage(e) {
    let t = this.reader.getBlob(e.name);
    const encrypt = await t.arrayBuffer();
    const n = await decrypt(encrypt, this.karamelToken);
    t = new Blob([n]);
    this.images.set(e.name, t);
  }
  addPage(e) {
    e = this.reader.getText(e.name);
    JSON.parse(e).forEach((e) => {
      this.pages.set(e.pageIndex, e);
    });
  }
  addLayoutPage(e) {
    e = this.reader.getText(e.name);
    JSON.parse(e).forEach((e) => {
      this.layoutPages.set(e.pageIndex, e);
    });
  }
  addTokens(e) {
    e = this.reader.getText(e.name);
    JSON.parse(e).forEach((e) => {
      this.tokens.set(e.pageIndex, e);
    });
  }
  addPanels(e) {
    e = this.reader.getText(e.name);
    JSON.parse(e).forEach((e) => {
      this.panels.set(e.pageIndex, e);
    });
  }
  addGlyphs(e) {
    e = this.reader.getText(e.name);
    this.fonts = JSON.parse(e);
  }
  addTableOfContent(e) {
    e = this.reader.getText(e.name);
    this.tableOfContent = JSON.parse(e);
  }
  addMetadata(e) {
    e = this.reader.getText(e.name);
    this.metadata = JSON.parse(e);
  }
}

// blob转换文件体积带单位
function formatBlobSize(blobSize) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let bytes = blobSize;
  let unitIndex = 0;

  while (bytes >= 1024 && unitIndex < units.length - 1) {
    bytes /= 1024;
    unitIndex++;
  }

  return `${bytes.toFixed(2)} ${units[unitIndex]}`;
}

//毫秒转换成mm:ss格式
function formatMillisecondsToMinutesSeconds(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const minutesStr = minutes.toString().padStart(2, "0");
  const secondsStr = remainingSeconds.toString().padStart(2, "0");

  return `${minutesStr}:${secondsStr}`;
}

//图片水平合并
function mergeBlobsHorizontally(blobs) {
  return new Promise((resolve, reject) => {
    const images = new Map();

    // 加载所有图片
    blobs.forEach((blob, index) => {
      const image = new Image();
      image.onload = () => {
        images.set(index, image);

        if (images.size === blobs.length) {
          // 所有图片已加载，开始合并
          mergeImages(
            Array.from(images.keys())
              .sort()
              .map((key) => {
                return images.get(key);
              })
          )
            .then(resolve)
            .catch(reject);
        }
      };
      image.onerror = reject;

      // 创建一个URL对象，指向Blob数据
      const url = URL.createObjectURL(blob);
      image.src = url;
    });
  });

  function mergeImages(images) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      let width = 0;
      let height = 0;

      // 计算总宽度和最高高度
      images.forEach((image) => {
        width += image.width;
        if (image.height > height) {
          height = image.height;
        }
      });

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      let xOffset = 0;

      // 绘制每个图片到canvas上
      images.forEach((image) => {
        ctx.drawImage(image, xOffset, 0, image.width, image.height);
        xOffset += image.width;
      });

      // 将canvas内容转换为Blob
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg"); // 可以根据需要更改图片格式
    });
  }
}

// 生成token
async function getToken(asin) {
  const { token, expiresAt } = await (
    await fetch(`/api/manga/getToken/${asin}`)
  ).json();

  console.debug(`token有效期至`, new Date(expiresAt));

  return { token, expiresAt };
}

// 当观察到变动时执行的回调函数
const popoverCallback = function (mutationsList, observer) {
  for (let mutation of mutationsList) {
    if (mutation.addedNodes[0] instanceof HTMLLIElement) {
      changeRightMenu(mutation.addedNodes[0]);
    } else if (
      mutation.addedNodes.length === 1 &&
      mutation.addedNodes[0].id === "backdrop"
    ) {
      // 漫画右击菜单增加下载漫画选项
      const addNode = mutation.addedNodes[0];
      let context_menu = addNode.querySelector("ul");
      console.debug("右键菜单", context_menu);

      const li = document.createElement("li");

      li.dataset.asin = currentBook;

      li.innerHTML = `<div id="tooltip-parent" class="${
        document.querySelector("#tooltip-parent").className
      }"><p class="${
        document.querySelector("#tooltip-parent>p").className
      }" >导出漫画</p></div>`;

      li.onclick = async (e) => {
        const startTime = Date.now();

        addNode.click();

        let book = itemViewResponse.itemsList.find(
          (s) => s.asin === currentBook
        );

        if (book === undefined) {
          throw new Error("无法找到漫画信息");
        }

        console.info(`导出漫画`, book.title);

        const cover_ele = document.querySelector(
          `#coverContainer-${currentBook}`
        );
        const div = document.createElement("div");

        div.setAttribute(
          "style",
          `position: absolute;
                  left: 0;
                  top: 0;
                  right: 0;
                  bottom: 0;
                  background: black;
                  z-index: 999;
                  opacity: 0.2;`
        );

        cover_ele.append(div);

        const tip = document.createElement("div");
        tip.setAttribute(
          "style",
          `
                      position: absolute;
                      bottom: -8%;
                      text-align: center;
                      white-space:nowrap;
                      font-size: 20px;
                      z-index:999;
                  `
        );

        cover_ele.parentElement.append(tip);

        function setProgress(i, text) {
          div.style.top = `${i}%`;

          try {
            port.postMessage({ progress: i });
          } catch(e){
            console.error("发送进度失败",e)
          }

          if (i == 100) {
            div.remove();
            tip.remove();
          } else {
            tip.innerText = text;
          }
        }

        const dom = await (await fetch(`/manga/${book.asin}`)).text();
        let domparser = new DOMParser();
        let doc = domparser.parseFromString(dom, "text/html");
        let bookInfo = JSON.parse(doc.querySelector("#bookInfo").innerText);
        console.info("bookInfo", bookInfo);

        let { contentGuid: revision, asin } = bookInfo;

        let { expiresAt, token } = await getToken(book.asin);

        async function get_render_data(startingPosition, numPage) {
          let reply = 3;

          while (reply-- > 0) {
            const render_data = await fetch(
              `/renderer/render?version=3.0&asin=${asin}&contentType=FullBook&revision=${revision}&fontFamily=Bookerly&fontSize=4.95&lineHeight=1.4&dpi=160&height=${innerHeight}&width=${innerWidth}&marginBottom=0&marginLeft=9&marginRight=9&marginTop=0&maxNumberColumns=2&theme=dark&locationMap=true&packageType=TAR&encryptionVersion=NONE&numPage=${numPage}&skipPageCount=0&startingPosition=${startingPosition}&bundleImages=false&token=${encodeURIComponent(
                token
              )}`
            );

            const contentType = render_data.headers.get("content-type");
            if (
              render_data.status === 200 &&
              contentType === "application/x-tar"
            ) {
              return new RenderData(await render_data.arrayBuffer(), {
                expiresAt,
                token,
              });
            } else if (render_data.status === 419) {
              const karamelToken = await getToken(book.asin);
              expiresAt = karamelToken.karamelToken;
              token = karamelToken.token;
              continue;
            } else {
              let second = 30;
              console.error(
                `非法render数据，请求状态码：${render_data.status},response content type:${contentType}，${second}秒后请求重试`
              );

              await sleep(second * 1000);
              continue;
            }
          }
        }

        console.info(`开始解析漫画render数据`);
        let render_data = await get_render_data(0, 0);

        let { images: imageLength, slice } = await chrome.storage.local.get([
          "images",
          "slice",
        ]);

        const totalImageLength = render_data.locationMap.locations.length - 1;

        if (imageLength === null || imageLength > totalImageLength) {
          imageLength = totalImageLength;
        }

        let count = 0;
        let totalSize = 0;
        let startingPosition = 1;
        let isEnd = false;
        let { per_img_timeout, page_timeout } = await chrome.storage.local.get([
          "per_img_timeout",
          "page_timeout",
        ]);
        console.info(
          `每抓取1张图片等待${per_img_timeout}毫秒，每抓取${slice}张图片等待${page_timeout}毫秒`
        );

        const zip = new JSZip();

        do {
          console.debug("startingPosition", startingPosition);

          async function refreshAuth() {
            const renderStartTime = Date.now();
            render_data = await get_render_data(startingPosition, slice);

            console.info(
              "漫画render数据解析完成，耗时：",
              Date.now() - renderStartTime + "ms",
              "\nrender_data",
              render_data
            );

            const {
              manifest: {
                cdn: { baseUrl, authParameter, isEncrypted },
                cdnResources,
              },
              pages,
            } = render_data;

            const pageData = [];
            for (const { children, endPositionId } of pages.values()) {
              children.map((item) => {
                item.cdnResources = cdnResources.find(
                  ({ url }) => item.imageReference === url
                );
                if (item.cdnResources === undefined) {
                  console.error(
                    `无法找到图片【${item.imageReference}】二进制数据`
                  );
                }
                return item;
              });

              pageData.push({
                endPositionId,
                children: children.sort((a, b) => b.elementId - a.elementId),
              });
            }
            return {
              baseUrl,
              pageData,
              cdnResources,
              authParameter,
              isEncrypted,
            };
          }

          let { baseUrl, isEncrypted, pageData, cdnResources, authParameter } =
            await refreshAuth();

          console.info(`总共要下载${cdnResources.length}张图片`);

          console.debug(`分段信息`, pageData);

          console.info("开始下载图片");

          for (let index = 0; index < pageData.length; index++) {
            let { endPositionId, children } = pageData[index];

            let filename;

            let lastImgBlob;

            let startCount = count;
            for (
              let childIndex = 0;
              childIndex < children.length;
              childIndex++
            ) {
              let {
                cdnResources: { url },
              } = children[childIndex];
              authParameter =
                authParameter ||
                children[childIndex].cdnResources.authParameter;

              console.debug(`下载第${count + 1}张图片`);
              const imgStartTime = Date.now();
              let reply = 3,
                c,
                fullurl = `${baseUrl}/${url}?${authParameter}&expiration=${expiresAt}&token=${encodeURIComponent(
                  token
                )}`;

              while (reply-- > 0) {
                try {
                  c = await fetch(fullurl);

                  let u,
                    contentType = c.headers.get("content-type");
                  if (isEncrypted && contentType === "text/plain") {
                    console.debug(`解密第${count + 1}张图片`);
                    const e = await c.arrayBuffer();
                    const t = await decrypt(e, { token, expiresAt });
                    u = new Blob([t]);
                  } else if (
                    !isEncrypted &&
                    contentType === "application/octet-stream"
                  ) {
                    u = await c.blob();
                  } else {
                    throw new Error(
                      `isEncrypted:${isEncrypted},response content-type:${contentType}`
                    );
                  }
                  console.debug(
                    `第${count + 1}张图片尺寸`,
                    formatBlobSize(u.size)
                  );
                  totalSize += u.size;

                  if (lastImgBlob !== undefined) {
                    u = await mergeBlobsHorizontally([lastImgBlob, u]);
                    filename = `${startCount + 1}_${
                      startCount + children.length
                    }`;
                  } else {
                    filename = `${startCount + 1}`;
                  }
                  lastImgBlob = u;

                  count++;

                  let progress = +((count * 100) / imageLength).toFixed(2);
                  console.debug(
                    `处理进度：${progress}%，当前图片处理时间${
                      Date.now() - imgStartTime
                    }ms，累计处理时间${formatMillisecondsToMinutesSeconds(
                      Date.now() - startTime
                    )}`
                  );

                  setProgress(
                    progress,
                    `导出进度：${progress}% ${count}/${imageLength}`
                  );

                  isEnd = progress === 100;
                  if (isEnd) {
                    break;
                  } else if (count % slice === 0) {
                    console.info(
                      `抓取了${count}张图片，等待${page_timeout}ms继续抓取`
                    );
                    await sleep(page_timeout);
                  } else {
                    await sleep(per_img_timeout);
                  }
                } finally {
                  if (c && c.status === 200 && filename) {
                    break;
                  } else {
                    const error = `下载第${count + 1}张图片出现异常${
                      c !== undefined ? `,请求状态码：${c.status}` : ""
                    }`;
                    console.error(error);
                    chrome.storage.local.set({
                      error: { e: error, fullurl, time: Date.now() },
                    });
                    const errWait = 30 * 1000;
                    console.info(`${errWait}ms 后重新请求`);

                    await sleep(errWait);

                    if (c.status === 403) {
                      let newAuth = await refreshAuth();

                      baseUrl = newAuth.baseUrl;
                      isEncrypted = newAuth.isEncrypted;
                      pageData = newAuth.pageData;
                      children = pageData[index].children;
                      url = children[childIndex].cdnResources.url;
                      authParameter =
                        newAuth.authParameter ||
                        children[childIndex].cdnResources.authParameter;

                      debugger;
                    } else if (c.status === 419) {
                      const karamelToken = await getToken(book.asin);
                      expiresAt = karamelToken.karamelToken;
                      token = karamelToken.token;
                    }

                    continue;
                  }
                }
              }
            }

            startingPosition = endPositionId + 1;

            console.debug(`打包第${filename}张图片`);
            filename && zip.file(`${filename}.jfif`, lastImgBlob);
          }
        } while (!isEnd);

        console.info(
          `${imageLength}张图片打包完成，累计处理时间${formatMillisecondsToMinutesSeconds(
            Date.now() - startTime
          )}`
        );

 

        zip
          .generateAsync({ type: "blob" })
          .then(function (content) {
            // see FileSaver.js
            port.postMessage({
              title: book.title,
              status: "打包完成，下载弹窗中选择保存路径。",
            });
            const zipSize = formatBlobSize(content.size);
            console.info("图片压缩包体积", zipSize);
            const zipName = `${book.title}.zip`;
            chrome.storage.local.set({
              [asin]: {
                url: URL.createObjectURL(content),
                size: zipSize,
                name: zipName,
              },
            });

            saveAs(content, zipName);

            setProgress(100);

            setTimeout(() => {
              port.postMessage({ title: "", status: "" });
            }, 3000);
          })
          .finally(() => {
            console.info(`漫画打包完成`);
          });
      };

      context_menu.append(li);
    } else {
      console.debug("mutation", mutation);
    }
  }
};

function observe() {
  // 创建一个观察器实例并传入回调函数
  popoverObserver = new MutationObserver(popoverCallback);
  // 以上述配置开始观察目标节点
  popoverObserver.observe(popover, config);

  popover.querySelectorAll("li").forEach((e) => {
    changeRightMenu(e);
  });
}

function disconnect() {
  // 之后，可停止观察
  popoverObserver.disconnect();
}

onload = async () => {
  popover = document.querySelector("#cover");
  console.debug("popover", popover);

  const { showUseTip } = await chrome.storage.local.get(["showUseTip"]);

  if (showUseTip) {
    showFirstTipModal(popover, showUseTip, async () => {
      await chrome.storage.local.set({ showUseTip: false });
      console.info("不再显示使用帮助");
    });
  }

  itemViewResponse = JSON.parse(
    document.querySelector("#itemViewResponse").innerText
  );
  console.debug("itemViewResponse", itemViewResponse);

  if ([popover, itemViewResponse].some((item) => item === undefined)) {
    throw new Error("初始化失败！！！！！！！！！！！！！！");
  }

  side_bar_filters = document.querySelectorAll("#side_bar_filters>li");

  comic_menu = document.querySelector("#sidebar_group_SIDE_BAR_FILTERS_COMICS");

  side_bar_filters.forEach((child) => {
    child.addEventListener("click", function (a) {
      console.info("asin", a.target.id);
      if (a.target.id === "sidebar_group_SIDE_BAR_FILTERS_COMICS") {
        observe();
      } else if (popoverObserver) {
        disconnect();
      }
    });
  });

  //侧栏菜单选中漫画才开始监听
  if (comic_menu.classList.contains("_3WNro9zd0be-e13VwjBm9S")) {
    observe();
  } else if (popoverObserver) {
    disconnect();
  }
};
