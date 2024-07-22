var Llms = (function(){
    let datos = null;
    function sendMessage(llm,model,messages){
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
        }).then((json) => {
            return Promise.resolve(json);
        });
    }
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
            localStorage.getItem("Llm-OpenRouter");
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
            localStorage.setItem("Agent-"+Date.now(),str);
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
            localStorage.setItem("Task-"+Date.now(),str);
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
    let agentMsg = [];
    function initAgent(agentId){
        let len = agentMsg.length;
        for(let i=0;i<len;i++){
            if(agentMsg[i].agent === agentId){
                return;
            }
        }
        agentMsg.push({
            agent: agentId,
            messages: []
        });
        agentMsg.messages.push({
            "role":"system",
            "content":
            `Your role is: ${unAgente.role}.
            Your goal is: ${unAgente.goal}.
            Your backstory is: ${unAgente.backstory}`
        });
    }
    function pushMsg(agentId,msg){
        let len = agentMsg.length;
        for(let i=0;i<len;i++){
            if(agentMsg[i].agent === agentId){
                agentMsg[i].messages.push(msg);
                return;
            }
        }
    }
    function getMsgs(agentId){
        let len = agentMsg.length;
        for(let i=0;i<len;i++){
            if(agentMsg[i].agent === agentId){
                return agentMsg[i].messages;
            }
        }
    }
    async function runSerial(){
        let len = taskList.length;
        for(let i=0;i<len;i++){
            let unaTarea = Tasks.read(taskList[i]);
            let elAgente = Agents.read(unaTarea.agent);
            initAgent(unaTarea.agent);
            
        }
        let vecRespuesta = [];
        for(let i=0;i<len;i++){
            let unaTarea = Tasks.read(taskList[i]);
            pushMsg(unaTarea.agent,{
                "role":"user",
                "content":
                `Your task is: ${unaTarea.description}.
                Your expected output is: ${unaTarea.expectedOutput}.
                Use the following context for completing the task: ${unaTarea.context}.`
            });
            let mensajes = getMsgs(unaTarea.agent);
            let elAgente = Agents.read(unaTarea.agent);
            respuesta = await Llms.sendMessage(elAgente.llm,elAgente.model,mensajes);
            pushMsg(unaTarea.agent,{
                "role":"assistant",
                "content":respuesta
            });
            vecRespuesta.push({
                agente: elAgente.role,
                respuesta: respuesta
            });
        }
        return vecRespuesta;
    }
    let taskList = [];
    return {
        clear: function(){
            taskList = [];
        },
        pushTask: function(taskid){
            taskList.push();
        },
        run: function(mode){
            agentMsg = [];
            switch(mode){
                case "serial":
                    return runSerial();
            }
            
        }
    };
}());
