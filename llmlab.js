class Agent {
    constructor(name,system,process,temperature) {
        this.name = name;
        this.system = system;
        this.process = process;
        this.thinking = null;
        this.temperature = temperature;
        this.llm = "";
        this.model = "";
        this.mensajes = [];
    }
    setLlms(llm,model){
        this.llm = llm;
        this.model = model;
    }
    setThinking(fun){
        this.thinking = fun;
    }
    async respond(subject) {
        let prompt = "**Subject**: "+ subject;
        prompt += "\n\n**Process**: "+ this.process;
        prompt += "\n\nExplain your reasoning step-by-step before providing the final response.";
        prompt += "\n\nAfter your response, provide a confidence score (1-10) indicating how confident you are in the accuracy and completeness of your answer.";

        let mensajes = [];
        mensajes.push({
          "role":"system",
          "content":this.system
        });
        let len = this.mensajes.length;
        for(let i=0;i<len;i++){
            mensajes.push(this.mensajes[i]);
        }
        mensajes.push({
          "role":"user",
          "content":prompt
        });

        let respuesta = await Llms.sendMsg(this.llm,this.model,mensajes,this.temperature);
        this.mensajes.push({
            "role":"user",
            "content":prompt,
            "prompt_tokens":respuesta.prompt
        });
        this.mensajes.push({
            "role":"assistant",
            "content":respuesta.message,
            "completion_tokens":respuesta.completion,
        });
        if(this.thinking){
            this.thinking(this.name,respuesta.message,respuesta.prompt,respuesta.completion);
        }
        return respuesta.message;
    }
}

class Manager {
    constructor(name,system,process,test,summary) {
        this.name = name;
        this.system = system;
        this.task = process;
        this.test = test;
        this.summary = summary;
        this.thinking = null;
        this.llm = "";
        this.model = "";
        this.agents = [];
    }
    setLlms(llm,model){
        this.llm = llm;
        this.model = model;
    }
    setThinking(fun){
        this.thinking = fun;
    }
    addAgent(agent){
        this.agents.push(agent);
    }
    async #makeSummary(subject, analysisResults){
        let mensajes = [];
        mensajes.push({
            "role":"system",
            "content":this.system
        });

        mensajes.push({
            "role":"user",
            "content":this.summary +"\n\n**subject** "+ subject
        });

        let len = analysisResults.length;
        for(let i=0;i<len;i++){
            mensajes.push({
                "role":"user",
                "content":analysisResults[i].result
            });
        }
        
        let respuesta = await Llms.sendMsg(this.llm,this.model,mensajes,1);
        if(this.thinking){
            this.thinking(this.name,respuesta.message,respuesta.prompt,respuesta.completion);
        }
        return respuesta.message;
    }
    async #isSatisfactoryResponse(subject, result) {
        let mensajes = [];
        mensajes.push({
            "role":"system",
            "content":this.system
        });

        mensajes.push({
            "role":"user",
            "content":this.test +"\n\n**subject** "+ subject +"\n\n**result** "+ result
        });
        
        let respuesta = await Llms.sendMsg(this.llm,this.model,mensajes,1);

        return respuesta.message;
    }
    async respond(subject) {
        const analysisResults = [];
        for (const agent of this.agents) {
            let n = 0; 
            let result;
            let err = "";
            while(n < 3){
                result = await agent.respond(subject + err);
                err = await this.#isSatisfactoryResponse(subject, result);
                if(err.length < 10){
                    break;
                }
                err = "\n\n**Make this corrections** "+ err;
                n++;
            }
            analysisResults.push({
                name: agent.name,
                result: result
            });
        }
        return await this.#makeSummary(subject,analysisResults);
    }
}

var Llms = (function(){
    let datos = null;
    return {
        init: function(){
            return fetch("https://openrouter.ai/api/v1/models", {
              method: "GET",
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
        sendMsg: function(llm,model,messages,temperature){
            let key = localStorage.getItem("Llm-OpenRouter");
            if(!key){
                return Promise.reject(Error("Ingrese la clave"));
            }
            let body = {
                "model": llm+"/"+model,
                "messages": messages,
                "temperature": temperature
            };
            return fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(body),
            }).then((response) => {
                if(!response.ok){
                    return Promise.reject(Error(response.status));
                }
                return response.json();
            }).then((response) => {
                if(response.error){
                    return Promise.reject(Error(response.error.message));
                }
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
                id = Tools.makeid(16);
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
        update: function(id,label,system,user){
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
    create: function(role,goal,backstory,process){
      let obj = {
        role:role,
        goal:goal,
        backstory:backstory,
        process: process
      };
      let str = JSON.stringify(obj);
      let id,x;
      do {
        id = Tools.makeid(16);
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
    update: function(id,role,goal,backstory,process){
      let obj = {
        role:role,
        goal:goal,
        backstory:backstory,
        process: process
      };
      let str = JSON.stringify(obj);
      localStorage.setItem("Agent-"+id,str);
    },
    delete: function(id){
      localStorage.removeItem("Agent-"+id);

      //remove the conversations with this agent
      let keys = Conversation.list();
      let len = keys.length;
      for(let i=0;i<len;i++){
        let oneConversation = Conversation.read(keys[i]);
        if(oneConversation.agent === id){
          Conversation.delete(keys[i]);
        }
      }
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

var Conversations = (function(){
  const MAX = 200;
  const DELTA = 20;
  let conversation;
  let idConversation;
  let last = 0;
  let nMsgs = 0;
    
  function hacerResumen(llm,model,resIni){
    let vecMensajes = [];
    vecMensajes.push(conversation[0]);

    let len = conversation.length;
    let i;
    for(i=1;i<len;i++){
      if(conversation[i].tmp>1e12){
        break;
      }
    }
    let ntmp = i; 
    for(let l=0;l<DELTA;l++){
      vecMensajes.push(conversation[i++]);
    }

    let objPregunta = {
      "role":"user",
      "content":"Haz un resumen de la conversación de tal manera que puedas hacer un seguimiento.",
    };
    vecMensajes.push(objPregunta);  
    return Llms.sendMsg(llm,model,vecMensajes).then((respuesta) => {
        let objRespuesta = {
          "role":"assistant",
          "content":respuesta.message,
        };
        localStorage.setItem("Conversation."+idConversation+"-"+ntmp,JSON.stringify(objPregunta));
        localStorage.setItem("Conversation."+idConversation+"-"+(ntmp+1),JSON.stringify(objRespuesta));
        objPregunta.tmp = ntmp;
        objRespuesta.tmp = ntmp+1;
        conversation.push(objPregunta);
        conversation.push(objRespuesta);
        let i = ntmp;
        for(let l=0;l<DELTA;l++){
          item = conversation[i++];
          localStorage.removeItem("Conversation."+idConversation+"-"+item.tmp);
        }
        nMsgs -=DELTA;
        conversation.splice(ntmp,DELTA);
        conversation.sort((a,b)=>{return (a.tmp>b.tmp)?+1:-1});
        resIni.completion += respuesta.completion;
        resIni.prompt += respuesta.prompt
        return Promise.resolve(resIni);
    });
}
  return {
    create: function(agentId,title){
      let obj = {
        agent:agentId,
        title:title,
      };
      let str = JSON.stringify(obj);
      let id,x;
      do {
        id = Tools.makeid(16);
        x = localStorage.getItem("Conversation-"+id);
      } while(x);
      localStorage.setItem("Conversation-"+id,str);
    },
    read: function(id){
      let str = localStorage.getItem("Conversation-"+id);
      if(!str){
        return null;
      }
      let obj = JSON.parse(str);
      return obj;
    },
    update: function(id,titulo){
      let str = localStorage.getItem("Conversation-"+id);
      if(!str){
        return;
      }
      let obj = JSON.parse(str);
      obj.titulo = titulo;
      str = JSON.stringify(obj);
      localStorage.setItem("Conversation-"+id,str);
      return;
    },
    delete: function(id){
      localStorage.removeItem("Conversation-"+id);

      //remove the messages from this conversation
      let len = localStorage.length;
      let llave = "Message."+id+"-";
      for(let i=0;i<len;i++){
        let key = localStorage.key(i);
        if(key.includes(llave)){
          localStorage.removeItem(key);
        }
      }
    },
    list: function(agentId){
      let len = localStorage.length;
      let res = [];
      for(let i=0;i<len;i++){
        let key = localStorage.key(i);
        if(key.includes("Conversation-")){
          let objStr = localStorage.getItem(key);
          let obj = JSON.parse(objStr);
          if(obj.agent === agentId){
            key = key.replace("Conversation-","");
            res.push(key);   
          }
        }
      }
      return res;
    },
    initChat: function(id){
      conversation = [];
      last = 0;
      let str = localStorage.getItem("Conversation-"+id);
      if(!str){
        idConversation = "";
        system = "";
        return false;
      }
      idConversation = id;
      let obj = JSON.parse(str);
      obj = Agents.read(obj.agent);

      let system = `
        Your role is: ${obj.role}.
        Your goal is: ${obj.goal}.
        Your backstory is: ${obj.backstory}.
        Your process is: ${obj.process}.
      `;
      conversation.push({
        "role":"system",
        "content": system,
        "tmp": 0
      });
      let len = localStorage.length;
      let llave = "Conversation."+id+"-";
      nMsgs = 0;
      for(let i=0;i<len;i++){
        let key = localStorage.key(i);
        if(key.includes(llave)){
          let valueStr = localStorage.getItem(key);
          let objMsg = JSON.parse(valueStr);
          objMsg.tmp = parseInt(key.replace(llave,""));
          if(objMsg.tmp >1e12){
            nMsgs++;  
          }
          conversation.push(objMsg);
        }
      }
      conversation.sort((a,b)=>{return (a.tmp>b.tmp)?+1:-1});
      return true;
    },
    ask: function(llm,model,pregunta){
      let tmp = Date.now();
      if(tmp === last){
        tmp++;
      }
      last = tmp;
      let objPregunta = {
          "role":"user",
          "content":pregunta,
      };
      let objPreguntaTmp = {
          "role":"user",
          "content":pregunta,
          "tmp": last
      };
      conversation.push(objPreguntaTmp);    
      return Llms.sendMsg(llm,model,conversation).then((respuesta) => {
        localStorage.setItem("Conversation."+idConversation+"-"+last,JSON.stringify(objPregunta));
        
        let tmp = Date.now();
        if(tmp === last){
            tmp++;
        }
        last = tmp;
        let objRespuesta = {
          "role":"assistant",
          "content":respuesta.message,
        };
        localStorage.setItem("Conversation."+idConversation+"-"+last,JSON.stringify(objRespuesta));
        objRespuesta.tmp = last; 
        conversation.push(objRespuesta);
        nMsgs += 2;
        if(nMsgs > MAX){
            return hacerResumen(llm,model,respuesta);
        }
        return Promise.resolve(respuesta);
      }).then((res)=>{
          return Promise.resolve(res);
      });
    },
    readChat: function(){
      let len = conversation.length;
      if(len<3){
        return [];
      }
      let min = len - 40;
      if(min < 1){
        min = 1;
      }
      return conversation.slice(min,len);
    },
  }
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
                id = Tools.makeid(16);
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
                id = Tools.makeid(16);
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
                id = Tools.makeid(16);
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

var Chat = (function(){
  const MAX = 200;
  const DELTA = 20;
  let conversation;
  let idConversation;
  let last = 0;
  let nMsgs = 0;
  let llm,model,promptid;
    
  function hacerResumen(llm,model,resIni){
    let vecMensajes = [];
    vecMensajes.push(conversation[0]);

    let len = conversation.length;
    let i;
    for(i=1;i<len;i++){
      if(conversation[i].tmp>1e12){
        break;
      }
    }
    let ntmp = i; 
    for(let l=0;l<DELTA;l++){
      vecMensajes.push(conversation[i++]);
    }

    let objPregunta = {
      "role":"user",
      "content":"Haz un resumen de la conversación de tal manera que puedas hacer un seguimiento.",
    };
    vecMensajes.push(objPregunta);  
    return Llms.sendMsg(llm,model,vecMensajes).then((respuesta) => {
        let objRespuesta = {
          "role":"assistant",
          "content":respuesta.message,
        };
        localStorage.setItem("Chat."+idConversation+"-"+ntmp,JSON.stringify(objPregunta));
        localStorage.setItem("Chat."+idConversation+"-"+(ntmp+1),JSON.stringify(objRespuesta));
        objPregunta.tmp = ntmp;
        objRespuesta.tmp = ntmp+1;
        conversation.push(objPregunta);
        conversation.push(objRespuesta);
        let i = ntmp;
        for(let l=0;l<DELTA;l++){
          item = conversation[i++];
          localStorage.removeItem("Chat."+idConversation+"-"+item.tmp);
        }
        nMsgs -=DELTA;
        conversation.splice(ntmp,DELTA);
        conversation.sort((a,b)=>{return (a.tmp>b.tmp)?+1:-1});
        resIni.completion += respuesta.completion;
        resIni.prompt += respuesta.prompt
        return Promise.resolve(resIni);
    });
}
  return {
    create: function(titulo){
      let obj = {
        title: titulo+":"+Date.now(),
      };
      let str = JSON.stringify(obj);
      let id,x;
      do {
        id = Tools.makeid(16);
        x = localStorage.getItem("Chat-"+id);
      } while(x);
      localStorage.setItem("Chat-"+id,str);
      return id;
    },
    read: function(id){
      let str = localStorage.getItem("Chat-"+id);
      if(!str){
        return null;
      }
      let obj = JSON.parse(str);
      return obj;
    },
    update: function(id,titulo){
      let str = localStorage.getItem("Chat-"+id);
      if(!str){
        return;
      }
      let obj = JSON.parse(str);
      obj.titulo = titulo;
      str = JSON.stringify(obj);
      localStorage.setItem("Chat-"+id,str);
      return;
    },
    delete: function(id){
      localStorage.removeItem("Chat-"+id);

      //remove the messages from this conversation
      let len = localStorage.length;
      let llave = "Message."+id+"-";
      for(let i=0;i<len;i++){
        let key = localStorage.key(i);
        if(key.includes(llave)){
          localStorage.removeItem(key);
        }
      }
    },
    list: function(){
      let len = localStorage.length;
      let res = [];
      for(let i=0;i<len;i++){
        let key = localStorage.key(i);
        if(key.includes("Chat-")){
          let objStr = localStorage.getItem(key);
          let obj = JSON.parse(objStr);
          obj.key = key;
          res.push(obj);
        }
      }
      return res;
    },
    setParams: function(_llm,_model,_promptid){
        llm = _llm;
        model = _model;
        promptid = _promptid;
        if(conversation && conversation.length > 0){
            conversation[0] = {
                "role":"system",
                "content": Prompts.read(promptid),
                "tmp": 0
            }
        }
    },
    initChat: function(id){
      last = 0;
      let str = localStorage.getItem("Chat-"+id);
      if(!str){
        conversation = null;  
        return false;
      }
      conversation = [];
      idConversation = id;
      conversation.push({
        "role":"system",
        "content": Prompts.read(promptid),
        "tmp": 0
      });
      let len = localStorage.length;
      let llave = "Conversation."+id+"-";
      nMsgs = 0;
      for(let i=0;i<len;i++){
        let key = localStorage.key(i);
        if(key.includes(llave)){
          let valueStr = localStorage.getItem(key);
          let objMsg = JSON.parse(valueStr);
          objMsg.tmp = parseInt(key.replace(llave,""));
          if(objMsg.tmp >1e12){
            nMsgs++;  
          }
          conversation.push(objMsg);
        }
      }
      conversation.sort((a,b)=>{return (a.tmp>b.tmp)?+1:-1});
      return true;
    },
    ask: function(pregunta){
      let tmp = Date.now();
      if(tmp === last){
        tmp++;
      }
      last = tmp;
      let objPregunta = {
          "role":"user",
          "content":pregunta,
      };
      let objPreguntaTmp = {
          "role":"user",
          "content":pregunta,
          "tmp": last
      };
      conversation.push(objPreguntaTmp);    
      return Llms.sendMsg(llm,model,conversation).then((respuesta) => {
        localStorage.setItem("Chat."+idConversation+"-"+last,JSON.stringify(objPregunta));
        
        let tmp = Date.now();
        if(tmp === last){
            tmp++;
        }
        last = tmp;
        let objRespuesta = {
          "role":"assistant",
          "content":respuesta.message,
        };
        localStorage.setItem("Chat."+idConversation+"-"+last,JSON.stringify(objRespuesta));
        objRespuesta.tmp = last; 
        conversation.push(objRespuesta);
        nMsgs += 2;
        if(nMsgs > MAX){
            return hacerResumen(llm,model,respuesta);
        }
        return Promise.resolve(respuesta);
      }).then((res)=>{
          return Promise.resolve(res);
      });
    },
    readChat: function(){
      let len = conversation.length;
      if(len<3){
        return [];
      }
      let min = len - 40;
      if(min < 1){
        min = 1;
      }
      return conversation.slice(min,len);
    },
  }
}());
