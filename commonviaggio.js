"use strict";

var Alerta = (function(){
    let contenedor = null;
    return {
        set: function(texto){
            if(contenedor === null){
                contenedor = document.createElement("div");
                contenedor.classList.add("toast-container","position-fixed","bottom-0","end-0","p-3");
                document.body.appendChild(contenedor);
            }
            let div = document.createElement("div");
            div.classList.add("toast");
            div.setAttribute('role', 'alert');
            div.setAttribute('aria-live', 'assertive');
            div.setAttribute('aria-atomic','true');
            div.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto">${texto}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body"></div>
            `;
            contenedor.appendChild(div);
            bootstrap.Toast.getOrCreateInstance(div).show();
        }
    };
}());

function loadGet(params) {
    return new Promise(function(myResolve, myReject) {
        const xhttp = new XMLHttpRequest();
        xhttp.onload = function() {
            let obj;
            try {
                obj = JSON.parse(this.responseText);
            } catch (e) {
                myReject(this.responseText);
                return;
            }
            if(obj.res === "OK"){
                myResolve(obj.msg);
            } else {
                myReject(obj.msg);
            }
        };
        xhttp.open("GET", "backend.php?"+params, true);
        xhttp.send();
    });
}

function loadPost(params) {
    return new Promise(function(myResolve, myReject) {
        const xhttp = new XMLHttpRequest();
        xhttp.onload = function() {
            let obj;
            try {
                obj = JSON.parse(this.responseText);
            } catch (e) {
                myReject(this.responseText);
                return;
            }
            if(obj.res === "OK"){
                myResolve(obj.msg);
            } else {
                myReject(obj.msg);
            }
        };
        xhttp.open("POST", "backend.php");
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send(params);
    });
}

function imgPost(file,userid){
    var form = new FormData();
    form.append("imagen", file);
    form.append("userid",userid);
    form.append("cmd","usuario_foto");
    
    return fetch('backend.php', {
        method: 'POST',
        body: form
    }).then(response => {
        return response.json();
    }).then(obj => {
        if(obj.res === "OK"){
            return Promise.resolve(obj.msg);
        }
        return Promise.reject(Error(obj.msg));
    });
}

function filePost(file){
    var form = new FormData();
    form.append("archivo", file);
    form.append("cmd","upload_archivo");
    
    return fetch('backend.php', {
        method: 'POST',
        body: form
    }).then(response => {
        return response.json();
    }).then(obj => {
        if(obj.res === "OK"){
            return Promise.resolve(obj.msg);
        }
        return Promise.reject(Error(obj.msg));
    });
}

function amd2sql(str){
    let vec = str.split("/");
    if(vec.length !== 3){
        return null;
    }
    return vec[2] +"-"+ vec[1] +"-"+ vec[0];
}

function sql2amd(str){
    let vec = str.split("-");
    if(vec.length !== 3){
        return null;
    }
    return vec[2] +"/"+ vec[1] +"/"+ vec[0];
}

function makeid(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let lng = characters.length;
    for (let i=0; i<length; i++) {
        result += characters.charAt(Math.floor(Math.random() * lng));
    }
    return result;
}

function fechaSinCero(str){
    let vec = str.split("-");
    let res = ""+ parseInt(vec[0],10) +"-"+ parseInt(vec[1],10) +"-"+ parseInt(vec[2],10);
    return res;
}

function logout(){
    localStorage.clear();
    let cmd = "cmd=logout";
    return loadGet(cmd);
}

var Perfiles = [{
    tipo: "vendedor",
    texto: "Ejecutivo de Ventas"
},{
    tipo: "controlador",
    texto: "Controlador"
},{
    tipo: "admin",
    texto: "Administrador"
}];

function getTextoPerfil(tipo){
    let len = Perfiles.length;
    for(let i=0;i<len;i++){
        if(Perfiles[i].tipo === tipo){
            return Perfiles[i].texto;
        }
    }
}
