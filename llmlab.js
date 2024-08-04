function makeid(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i=0; i<length; i++) {
        result += characters.charAt(Math.floor(Math.random() * 62));
    }
    return result;
}

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
        modal: function(strHtml){
            let span = document.createElement("span");
            span.classList.add("w3-button","w3-display-topright");
            span.innerHTML = "&times;";

            let divUser = document.createElement("div");
            divUser.innerHTML = strHtml;

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
                span = null;
            }
            divContainer = null;
            divUser = null;
            divContent = null;
        }
    };
}());

var Llms = (function(){
    let datos = null;
    return {
        init: function(){
            return fetch("https://openrouter.ai/api/v1/models", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
            }).then((response) => {
                if(!response.ok){
                    return Promise.reject(Error(response.status));
                }
                return response.json();
            }).then((json) => {
                datos = json.data;
                return Promise.resolve();
            });
        },
        getLlms: function(){
            let len = datos.length;
            let res = [];
            for(let i=0;i<len;i++){
                let item = datos[i];
                let id = item.id;
                let vec = id.split("/");
                let base = vec[0];
                if(res.indexOf(base)<0){
                    res.push(base);
                }
            }
            return res;
        },
        getModels: function(llm){
            let len = datos.length;
            let res = [];
            for(let i=0;i<len;i++){
                let item = datos[i];
                let id = item.id;
                let vec = id.split("/");
                let base = vec[0];
                if(base === llm){
                    res.push(vec[1]);
                }
            }
            return res;
        },
        setKey: function(key){
            localStorage.setItem("Llm-OpenRouter",key);
        },
        getData: function(llm,model){
            let len = datos.length;
            let res = [];
            for(let i=0;i<len;i++){
                let item = datos[i];
                if(item.id === llm+"/"+model){
                    return item;
                }
            }
            return null;
        },
        delKey: function(llm){
            localStorage.removeItem("Llm-OpenRouter");
        },
        getKey: function(){
            return localStorage.getItem("Llm-OpenRouter");
        },
        sendMsg: function(llm,model,messages){
            let key = localStorage.getItem("Llm-OpenRouter");
            if(!key){
                return Promise.reject(Error("Ingrese la clave"));
            }
            return fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                "model": llm+"/"+model,
                "messages": messages,
              }),
            }).then((response) => {
                if(!response.ok){
                    return Promise.reject(Error(response.status));
                }
                return response.json();
            }).then((response) => {
                let obj = {
                    prompt: response.usage.prompt_tokens,
                    completion: response.usage.completion_tokens,
                    message: response.choices[0].message.content
                };
                return obj;
            });
        }
    };
}());

var Prompts = (function(){
    return {
        create: function(label,system,user){
            let obj = {
                label: label,
                system: system,
                user: user
            };
            let str = JSON.stringify(obj);
            let id,x;
            do {
                id = makeid(16);
                x = localStorage.getItem("Prompt-"+id);
            } while(x);
            localStorage.setItem("Prompt-"+id,str);
        },
        read: function(id){
            let str = localStorage.getItem("Prompt-"+id);
            if(!str){
                return null;
            }
            let obj = JSON.parse(str);
            return obj;
        },
        update: function(id,label,systen,user){
            let obj = {
                label: label,
                system: system,
                user: user
            };
            let str = JSON.stringify(obj);
            localStorage.setItem("Prompt-"+id,str);
        },
        delete: function(id){
            localStorage.removeItem("Prompt-"+id);
        },
        list: function(){
            let len = localStorage.length;
            let res = [];
            for(let i=0;i<len;i++){
                let key = localStorage.key(i);
                if(key.includes("Prompt-")){
                    key = key.replace("Prompt-","");
                    res.push(key);
                }
            }
            return res;
        }
    };
}());

var Agents = (function(){
    return {
        create: function(role,goal,backstory,llm,model){
            let obj = {
                role:role,
                goal:goal,
                backstory:backstory,
                llm:llm,
                model:model
            };
            let str = JSON.stringify(obj);
            let id,x;
            do {
                id = makeid(16);
                x = localStorage.getItem("Agent-"+id);
            } while(x);
            localStorage.setItem("Agent-"+id,str);
        },
        read: function(id){
            let str = localStorage.getItem("Agent-"+id);
            if(!str){
                return null;
            }
            let obj = JSON.parse(str);
            return obj;
        },
        update: function(id,role,goal,backstory,llm,model){
            let obj = {
                role:role,
                goal:goal,
                backstory:backstory,
                llm:llm,
                model:model
            };
            let str = JSON.stringify(obj);
            localStorage.setItem("Agent-"+id,str);
        },
        delete: function(id){
            localStorage.removeItem("Agent-"+id);
        },
        list: function(){
            let len = localStorage.length;
            let res = [];
            for(let i=0;i<len;i++){
                let key = localStorage.key(i);
                if(key.includes("Agent-")){
                    key = key.replace("Agent-","");
                    res.push(key);
                }
            }
            return res;
        },
    };
}());

var Tasks = (function(){
    return {
        create: function(title,description,agent,expectedOutput,context){
            let obj = {
                title:title,
                description:description,
                agent:agent,
                expectedOutput:expectedOutput,
                context:context
            };
            let str = JSON.stringify(obj);
            let id,x;
            do {
                id = makeid(16);
                x = localStorage.getItem("Task-"+id);
            } while(x);
            localStorage.setItem("Task-"+id,str);
        },
        read: function(id){
            let str = localStorage.getItem("Task-"+id);
            if(!str){
                return null;
            }
            let obj = JSON.parse(str);
            return obj;
        },
        update: function(id,title,description,agent,expectedOutput,context){
            let obj = {
                title:title,
                description:description,
                agent:agent,
                expectedOutput:expectedOutput,
                context:context
            };
            let str = JSON.stringify(obj);
            localStorage.setItem("Task-"+id,str);
        },
        delete: function(id){
            localStorage.removeItem("Task-"+id);
        },
        list: function(){
            let len = localStorage.length;
            let res = [];
            for(let i=0;i<len;i++){
                let key = localStorage.key(i);
                if(key.includes("Task-")){
                    key = key.replace("Task-","");
                    res.push(key);
                }
            }
            return res;
        }
    };
}());

var Results = (function(){
    return {
        create: function(label,task,result){
            let obj = {
                label: label,
                task:  task,
                result: result
            };
            let str = JSON.stringify(obj);
            let id,x;
            do {
                id = makeid(16);
                x = localStorage.getItem("Result-"+id);
            } while(x);
            localStorage.setItem("Result-"+id,str);
        },
        read: function(id){
            let str = localStorage.getItem("Result-"+id);
            if(!str){
                return null;
            }
            let obj = JSON.parse(str);
            return obj;
        },
        delete: function(id){
            localStorage.removeItem("Result-"+id);
        },
        list: function(){
            let len = localStorage.length;
            let res = [];
            for(let i=0;i<len;i++){
                let key = localStorage.key(i);
                if(key.includes("Result-")){
                    key = key.replace("Result-","");
                    res.push(key);
                }
            }
            return res;
        }
    };
}());

var Process = (function(){
    let vecResponses = [];
    function read(id){
        let str = localStorage.getItem("Process-"+id);
        if(!str){
            return null;
        }
        let obj = JSON.parse(str);
        obj.response = "";
        let len = vecResponses.length;
        for(let i=0;i<len;i++){
            if(vecResponses[i].id === id){
                obj.response = vecResponses[i].msg;
                break;
            }
        }
        return obj;
    }
    function crearMensajes(laTarea,elAgente,vecPre){
        let vecMsg = [];
        vecMsg.push({
            "role":"system",
            "content":
            `Your role is: ${elAgente.role}.
            Your goal is: ${elAgente.goal}.
            Your backstory is: ${elAgente.backstory}`
        });
        let len = vecPre.length;
        for(let i=0;i<len;i++){
            let unaPre = vecPre[i];
            vecMsg.push({
                "role":"assistant",
                "content":
                `The following text was elaborated by this agent: "${unaPre.agent}" with this goal: ${unaPre.task}.
                ${unaPre.response}.`
            }); 
        }
        vecMsg.push({
            "role":"user",
            "content":
            `Your task is: ${laTarea.description}.
            Your expected output is: ${laTarea.expectedOutput}.
            Use the following context for completing the task: ${laTarea.context}.
            Consider all previous information as context and generate a response that aligns with your role and goal.
            `
        });
        return vecMsg;
    }
    async function evaluar(pos,cb){
        let elStep = read(vecResponses[pos].id);
        if(elStep.response !== ""){
            return true;
        }
        let len = elStep.preSteps.length;
        let vecPre = [];
        for(let i=0;i<len;i++){
            let unStep = read(elStep.preSteps[i]);
            if(unStep.response === ""){
                return false;
            }
            let unaTarea = Tasks.read(unStep.taskid);
            let unAgente = Agents.read(unaTarea.agent);
            vecPre.push({
                agent: unAgente.role,
                task: unaTarea.description,
                response: unStep.response
            });
        }
        let laTarea = Tasks.read(elStep.taskid);
        let elAgente = Agents.read(laTarea.agent);
        let vecMsg = crearMensajes(laTarea,elAgente,vecPre);
        
        let res = await Llms.sendMsg(elAgente.llm,elAgente.model,vecMsg);
        let msg = res.choices[0].message.content;
        vecResponses[pos].msg = msg;
        cb(elStep.label,msg);
        return true;
    }
    
    return {
        create: function(label,taskid,preSteps){
            let obj = {
                label: label,
                taskid: taskid,
                preSteps: preSteps
            };
            let str = JSON.stringify(obj);
            let id,x;
            do {
                id = makeid(16);
                x = localStorage.getItem("Process-"+id);
            } while(x);
            localStorage.setItem("Process-"+id,str);
            vecResponses.push({
                id: id,
                msg: ""
            });
            
        },
        read: read,
        update: function(id,label,taskid,preSteps){
            let obj = {
                label: label,
                taskid: taskid,
                preSteps: preSteps
            };
            let str = JSON.stringify(obj);
            localStorage.setItem("Process-"+id,str);
        },
        delete: function(id){
            localStorage.removeItem("Process-"+id);
            
            let len = vecResponses.length;
            for(let i=0;i<len;i++){
                if(vecResponses[i].id === id){
                    vecResponses.splice(i,1);
                    return;
                }
            }
        },
        list: function(){
            let len = localStorage.length;
            let res = [];
            for(let i=0;i<len;i++){
                let key = localStorage.key(i);
                if(key.includes("Process-")){
                    key = key.replace("Process-","");
                    res.push(key);
                }
            }
            return res;
        },
        init: function(){
            vecResponses = [];
            let len = localStorage.length;
            for(let i=0;i<len;i++){
                let key = localStorage.key(i);
                if(key.includes("Process-")){
                    key = key.replace("Process-","");
                    vecResponses.push({
                        id: key,
                        msg: ""
                    });
                }
            }
        },
        run: async function(cb){
            let len = vecResponses.length;
            for(let i=0;i<len;i++){
                vecResponses[i].msg = "";
            }
            let n;
            do{
                n = 0;
                for(let i=0;i<len;i++){
                    let res = await evaluar(i,cb);
                    if(res) {
                        n++;
                    }
                }
                
            } while(n<len);
        }
    };
}());
