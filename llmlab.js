var Llms = (function(){
    let vecLlms = [];
    vecLlms.push({
        name: "chatgpt",
        models: [{
          name: "gpt-4o",
          envio: 5,
          recepcion: 15
        },{
          name: "gpt-4-turbo",
          envio: 10,
          recepcion: 30
        },{
          name: "gpt-4",
          envio: 30,
          recepcion: 60
        },{
          name: "gpt-4-32k",
          envio: 60,
          recepcion: 120
        },{
          name: "gpt-3.5-turbo-0125",
          envio: 0.5,
          recepcion: 1.5
        }]
    });
    vecLlms.push({
        name: "gemini",
        models: [{
          name: "gem-4o",
          envio: 5,
          recepcion: 15
        },{
          name: "gem-4-turbo",
          envio: 10,
          recepcion: 30
        },{
          name: "gem-4",
          envio: 30,
          recepcion: 60
        },{
          name: "gem-4-32k",
          envio: 60,
          recepcion: 120
        },{
          name: "gem-3.5-turbo-0125",
          envio: 0.5,
          recepcion: 1.5
        }]
    });
    vecLlms.push({
        name: "claude",
        models: [{
          name: "cla-4o",
          envio: 5,
          recepcion: 15
        },{
          name: "cla-4-turbo",
          envio: 10,
          recepcion: 30
        },{
          name: "cla-4",
          envio: 30,
          recepcion: 60
        },{
          name: "cla-4-32k",
          envio: 60,
          recepcion: 120
        },{
          name: "cla-3.5-turbo-0125",
          envio: 0.5,
          recepcion: 1.5
        }]
    });
    
    function postChatgpt(model,messages){
        let api_key = localStorage.getItem("Llm-chatgpt");
        if(!api_key){
            return Promise.reject(Error("No tiene clave"));
        }
        return fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+api_key,
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.5,
                top_p: 0.7,
                n: 1,
                stream: false,
                presence_penalty: 0,
                frequency_penalty: 0,
            }),
        }).then(response => {
            if (!response.ok) {
                console.log(response);
                return Promise.reject(Error("No se pudo responder"));
            }
            return response.json();
        }).then(data => {
            let res = {
                completion_tokens: data.usage.completion_tokens,
                prompt_tokens: data.usage.prompt_tokens,
                content: data.choices[0].message.content
            };
            return Promise.resolve(res);
        });
    }
    return {
        setKey: function(llm,key){
            localStorage.setItem("Llm-"+llm,key);
        },
        delKey: function(llm){
            localStorage.removeItem("Llm-"+llm);
        },
        getKey: function(llm){
            return localStorage.getItem("Llm-"+llm);
        },
        list: function(){
            let len = vecLlms.length;
            let res = [];
            for(let i=0;i<len;i++){
                res.push(vecLlms[i].name);
            }
            return res;
        },
        getModels: function(llm){
            let len = vecLlms.length;
            for(let i=0;i<len;i++){
                if(vecLlms[i].name === llm){
                    return vecLlms[i].models;
                }
            }
            return [];
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
        }
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
