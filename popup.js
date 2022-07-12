chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.info(request)
        if (request.status) {
            document.querySelector("#status").innerText = request.status
        }
        if (request.title) {
            document.querySelector("#title").innerText = request.title
        }
        if (request.start) {
            NProgress.start()
        }
        if (request.progress) {
            NProgress.set(request.progress)
        }
        if (request.done) {
            NProgress.done()
        }
    }
);