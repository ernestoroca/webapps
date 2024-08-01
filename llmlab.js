function makeid(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i=0; i<length; i++) {
        result += characters.charAt(Math.floor(Math.random() * 62));
    }
    return result;
}

var Llms = (function(){
    let datos = null;
    return {
        init: function(){
            fetch("https://openrouter.ai/api/v1/models", {
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
                    return Promise.reject(Error(esponse.status));
                }
                return response.json();
            });
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
        cb(elStep.label,res);
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
