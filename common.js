var W3 = (function(){
    return {
        toast: function(txt,tmp){
            let toastMaster = document.getElementById("toastMaster");
            if(toastMaster === null){
                toastMaster = document.createElement("div");
                toastMaster.style.position = "fixed";
                toastMaster.id = "toastMaster"
                toastMaster.style.bottom = "0";
                toastMaster.style.left = "0";
                toastMaster.style.width = "100%";
                document.body.appendChild(toastMaster);
            }
            let div = document.createElement("div");
            div.classList.add("w3-row");
            div.innerHTML = `
              <div class="w3-col s1"><p></p></div>
              <div class="w3-col s10 w3-black w3-container"><p>${txt}</p></div>`;
            toastMaster.appendChild(div);
            toastMaster = null;
            setTimeout(()=>{
                div.remove();
                div = null;
            },tmp);
        },
        sidebar: function(a,b){
            if(a){
                document.getElementById(a.open).onclick = function(){
                    let elem = document.getElementById(a.id);
                    elem.style.display = (elem.style.display === "none")?"block":"none";
                };
                document.getElementById(a.id).onclick = function(){
                    document.getElementById(a.id).style.display = "none";
                }
            }
            if(b){
                document.getElementById(b.open).onclick = function(){
                    let elem = document.getElementById(b.id);
                    elem.style.display = (elem.style.display === "none")?"block":"none";
                };
                document.getElementById(b.id).onclick = function(){
                    document.getElementById(b.id).style.display = "none";
                }
            }
        },
        bar: function(id,param){
            let elemento = document.getElementById(id);
            if(!elemento){
                return;
            }
            elemento.parambar = {
                active: param.active,
                pasive: param.pasive,
                onchange: param.onchange
            };
            elemento.onclick = function(evento){
                let target = evento.target;
                if(!target.classList.contains("w3-bar-item")){
                    return;
                }
                target.classList.add("w3-bar-mark");
                let parent = target.parentNode;
                let param = parent.parambar;
                let tablist = parent.querySelectorAll(".w3-bar-item");
                let len = tablist.length;
                let pos;
                for(let i=0;i<len;i++){
                    let unTabList = tablist[i].classList;
                    if(unTabList.contains("w3-bar-mark")){
                        pos = i;
                        if(param.pasive){
                            unTabList.remove(param.pasive);
                        }
                        if(!unTabList.contains(param.active)){
                            unTabList.add(param.active);
                        }
                    } else {
                        unTabList.remove(param.active);
                        if(param.pasive && !unTabList.contains(param.pasive)){
                            unTabList.add(param.pasive);
                        }
                    }
                }
                target.classList.remove("w3-bar-mark");
                param.onchange(pos);
                target = null;
            };
            elemento = null;
        },
        textarea: function(id){
            let elem = document.getElementById(id);
            elem.setAttribute("style", "height:" + (elem.scrollHeight) + "px;overflow-y:hidden;");
            elem.addEventListener("input", function(){
                this.style.height = 0;
                this.style.height = (this.scrollHeight) + "px";
            }, false);
            elem = null;
        },
        inputChange: function(id){
            document.getElementById(id).dispatchEvent(new Event("input"));
        },
        modal: function(divHtml){
            let span = document.createElement("span");
            span.classList.add("w3-button","w3-display-topright");
            span.innerHTML = "&times;";

            let divUser = document.createElement("div");
            divUser.innerHTML = divHtml;

            let divContainer = document.createElement("div");
            divContainer.classList.add("w3-container");
            divContainer.appendChild(span);
            divContainer.appendChild(divUser);

            let divContent = document.createElement("div");
            divContent.classList.add("w3-modal-content");
            divContent.appendChild(divContainer);

            let divModal = document.createElement("div");
            divModal.classList.add("w3-modal");
            divModal.appendChild(divContent);

            document.body.appendChild(divModal);
            divModal.style.display='block';
            
            span.onclick = function(){
                divModal.remove();
                divModal = null;
            }
            divContainer = null;
            divUser = null;
            divContent = null;
            span = null;
        }
    };
}());

var IndexedStorage = (function(){
    let db;
    const openRequest = indexedDB.open('IndexedStorage');
    openRequest.onupgradeneeded = function(event) {
        event.target.result.createObjectStore("KeyValue");
    };
    openRequest.onsuccess = function(event) {
        db = event.target.result;
    };
    openRequest.onerror = function(event) {
        console.error("Database error:" + event.target.errorCode);
    };
    return {
        clear: function(){
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readwrite');
                let st = tx.objectStore('KeyValue');
                
                var gRequest = st.openCursor();
                
                gRequest.onsuccess = function() {
                    let cursor = gRequest.result;
                    if (!cursor) {
                        resolve();
                    } else {
                        st.delete(cursor.key);
                        cursor.continue();
                    }
                };
                gRequest.onerror = function() {
                    reject(gRequest.error);
                };
            });
        },
        setItem: function(key, value) {
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readwrite');
                let st = tx.objectStore('KeyValue');
                let sRequest = st.put(value, key);
                sRequest.onsuccess = function() {
                    resolve(key);
                };
                sRequest.onerror = function() {
                    reject(sRequest.error);
                };
            });
        },
        getItem: function(key) {
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readonly');
                let st = tx.objectStore('KeyValue');
                let gRequest = st.get(key);
                gRequest.onsuccess = function() {
                    resolve(gRequest.result);
                };
                gRequest.onerror = function() {
                    reject(gRequest.error);
                };
            });
        },
        removeItem: function(key) {
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readwrite');
                let st = tx.objectStore('KeyValue');
                let rRequest = st.delete(key);
                rRequest.onsuccess = function() {
                    resolve();
                };
                rRequest.onerror = function() {
                    reject(rRequest.error);
                };
            });
        },
        length: function(){
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readonly');
                let st = tx.objectStore('KeyValue');
                let cRequest = st.count();
                cRequest.onsuccess = function() {
                    resolve(cRequest.result);
                }
                cRequest.onerror = function() {
                    reject(cRequest.error);
                };
            });
        },
        key: function(n){
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readonly');
                let st = tx.objectStore('KeyValue');
                let read = false;
                let cRequest = st.openCursor();
                
                cRequest.onsuccess = function(e) {
                    let cursor = cRequest.result;
                    if (!cursor) {
                        resolve(null);
                    } else if(n === 0){
                        resolve(cursor.key);
                    } else if(read){
                        resolve(cursor.key);
                    } else {
                        read = true;
                        cursor.advance(n-1);
                    }
                };
                cRequest.onerror = function() {
                    reject(cRequest.error);
                };
            });
        },
        nextKey: function(key){
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readonly');
                let st = tx.objectStore('KeyValue');
                
                let range = IDBKeyRange.lowerBound(key, true);
                var gRequest = st.openCursor(range);
                
                gRequest.onsuccess = function(e) {
                    let cursor = gRequest.result;
                    if (!cursor) {
                        resolve(null);
                    } else {
                        resolve(cursor.key);
                    }
                };
                gRequest.onerror = function() {
                    reject(gRequest.error);
                };
            });
        },
        nextItem: function(key){
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readonly');
                let st = tx.objectStore('KeyValue');
                
                let range = IDBKeyRange.lowerBound(key, true);
                var gRequest = st.openCursor(range);
                
                gRequest.onsuccess = function(e) {
                    let cursor = gRequest.result;
                    if (!cursor) {
                        resolve(null);
                    } else {
                        resolve({
                            key: cursor.key,
                            item: cursor.value
                        });
                    }
                };
                gRequest.onerror = function() {
                    reject(gRequest.error);
                };
            });
        },
        nextKeyList: function(key,n){
            return new Promise((resolve, reject) => {
                let keylist = [];
                let tx = db.transaction('KeyValue', 'readonly');
                let st = tx.objectStore('KeyValue');
                
                let range = IDBKeyRange.lowerBound(key, true);
                var gRequest = st.openCursor(range);
                
                gRequest.onsuccess = function(e) {
                    let cursor = gRequest.result;
                    if (!cursor) {
                        resolve(keylist);
                    } else {
                        keylist.push(cursor.key);
                        if(keylist.length >= n){
                            resolve(keylist);
                        } else {
                            cursor.continue();
                        }
                    }
                };
                gRequest.onerror = function() {
                    reject(gRequest.error);
                };
            });
        },
        nextList: function(key,n){
            return new Promise((resolve, reject) => {
                let keylist = [];
                let valuelist = [];
                let tx = db.transaction('KeyValue', 'readonly');
                let st = tx.objectStore('KeyValue');
                
                let range = IDBKeyRange.lowerBound(key, true);
                var gRequest = st.openCursor(range);
                
                gRequest.onsuccess = function(e) {
                    let cursor = gRequest.result;
                    if (!cursor) {
                        resolve({
                            keys: keylist,
                            values: valuelist
                        });
                    } else {
                        keylist.push(cursor.key);
                        valuelist.push(cursor.value);
                        if(keylist.length >= n){
                            resolve({
                                keys: keylist,
                                values: valuelist
                            });
                        } else {
                            cursor.continue();
                        }
                    }
                };
                gRequest.onerror = function() {
                    reject(gRequest.error);
                };
            });
        },
        jumpKey: function(key,n){
            return new Promise((resolve, reject) => {
                let tx = db.transaction('KeyValue', 'readonly');
                let st = tx.objectStore('KeyValue');
                let read = false;
                
                let range = IDBKeyRange.lowerBound(key, true);
                let gRequest = st.openCursor(range);
                
                gRequest.onsuccess = function(e) {
                    let cursor = gRequest.result;
                    if (!cursor) {
                        resolve(null);
                    } else if(n === 0){
                        resolve(cursor.key);
                    } else if(read){
                        resolve(cursor.key);
                    } else {
                        read = true;
                        cursor.advance(n-1);
                    }
                };
                gRequest.onerror = function() {
                    reject(gRequest.error);
                };
            });
        }
    };
}());

var Tools = (function(){
    makeid: function(l){
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let lng = characters.length;
        for (let i=0; i<l; i++) {
            result += characters.charAt(Math.floor(Math.random() * lng));
        }
        return result;
    }
}());
