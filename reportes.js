"use strict";
/* esversion: 8*/
/*global loadGet, Alerta*/

var Datos = (function(){
    let losVendedores = [];
    let lasReservas = [];
    function getDia(amd){
        let vec = amd.split("-");
        let fecha = new Date(parseInt(vec[0]),parseInt(vec[1])-1,parseInt(vec[2]));
        return fecha.getDay();
    }
    function getUnUsuario(id){
        let str = sessionStorage.getItem("usuario-"+id);
        if(str){
            let obj = JSON.parse(str);
            losVendedores.push(obj);
            return Promise.resolve(obj);
        }
        let cmd = "cmd=usuario_uno";
        cmd += "&id="+id;
        return loadGet(cmd).then(datos => {
            if(datos.perfil === "vendedor"){
                sessionStorage.setItem("usuario-"+id,JSON.stringify(datos));
                losVendedores.push(datos);
            }
        }).catch(error => {
            Alerta.set(error);
            console.log(error.msg);
        });
    }
    async function getUsuarios(){
        let pagina = 0;
        let len;
        do{
            let cmd = "cmd=usuario_lista";
            cmd += "&pagina="+pagina;
            cmd += "&estado=activo";
            let lista = await loadGet(cmd);
            len = lista.length;
            for(let i=0;i<len;i++){
                await getUnUsuario(lista[i]);
            }
            pagina += len;
        }while(len>0);
        return;
    }
    function getUnaReserva(id){
        let str = sessionStorage.getItem("reserva-"+id);
        if(str){
            let obj = JSON.parse(str);
            return Promise.resolve(obj);
        }
        let cmd = "cmd=reserva_una";
        cmd += "&id="+id;
        return loadGet(cmd).then((res) => {
            sessionStorage.setItem("reserva-"+id,JSON.stringify(res));
            return Promise.resolve(res);
        });
    }
    function getUnVehiculo(vin){
        let str = sessionStorage.getItem("vehiculo-"+vin);
        if(str){
            let obj = JSON.parse(str);
            return Promise.resolve(obj);
        }
        let cmd = "cmd=item_uno";
        cmd += "&vin="+vin;
        return loadGet(cmd).then((res) => {
            sessionStorage.setItem("vehiculo-"+vin,JSON.stringify(res));
            return Promise.resolve(res);
        });
    }
    function getImportacion(id){
        let str = sessionStorage.getItem("importacion-"+id);
        if(str){
            let obj = JSON.parse(str);
            return Promise.resolve(obj);
        }
        let cmd = "cmd=importacion_una";
        cmd += "&id="+id;
        return loadGet(cmd).then((res) => {
            sessionStorage.setItem("importacion-"+id,JSON.stringify(res));
            return Promise.resolve(res);
        });
    }
    async function getSemana(anho,mes,dia){
        let fecha = ""+anho;
        fecha += (mes<10)?"-0"+mes:"-"+mes;
        fecha += (dia<10)?"-0"+dia:"-"+dia;
        let cmd = "cmd=reserva_lista";
        cmd += "&fecha="+fecha;
        let reservas = await loadGet(cmd);
        let len = reservas.length;
        let vecReservas = [];
        for(let i=0;i<len;i++){
            let datosReserva = await getUnaReserva(reservas[i]);
            let datosVin = await getUnVehiculo(datosReserva.vin);
            datosReserva.fila = JSON.parse(datosVin.fila.replace("\r",""));
            let datosImportacion = await getImportacion(datosVin.importacion);
            datosReserva.cabeza = JSON.parse(datosImportacion.cabeza.replace("\r",""));
            let datosVendedor = await getUnUsuario(datosReserva.vendedor);
            datosReserva.datosVendedor = datosVendedor;
            vecReservas.push(datosReserva);
        }
        return vecReservas;
    }
    async function getMes(anho,mes){
        let fecha = (mes<10)?anho+"-0"+mes:anho+"-"+mes;
        let primerDia = new Date(anho,mes-1,1,0,0,0);
        let domingo = primerDia.getTime() - primerDia.getDay()*24*60*60*1000;
        let vecReservas = [];
        for(let i=0;i<5;i++){
            let elDia = new Date(domingo);
            let nvasReservas = await getSemana(elDia.getFullYear(),elDia.getMonth()+1,elDia.getDate());
            let len = nvasReservas.length;
            for(let j=0;j<len;j++){
                let unaReserva = nvasReservas[j];
                if (unaReserva.fecha.includes(fecha)){
                    vecReservas.push(unaReserva);
                }
            }
            domingo += 7*24*60*60*1000;
        }
        return vecReservas;
    }
    async function getStatSemana(anho,mes,dia){
        let fecha = ""+anho+"-"+mes+"-"+dia;

        let vecReservas = [];

        let cmd = "cmd=reserva_lista";
        cmd += "&fecha="+fecha;
        let reservas = await loadGet(cmd);
        let len = reservas.length;
        for(let i=0;i<len;i++){
            let datosReserva = await getUnaReserva(reservas[i]);
            vecReservas.push(datosReserva);
        }
        return vecReservas;
    }
    async function getStatMes(anho,mes){
        let _mes = (mes<10)?"0"+mes:mes;
        let stat = [];
        for(let d=0;d<7;d++){
            let horas = [];
            for(let h=0;h<12;h++){
                horas.push(0); 
            }
            stat.push(horas);
        }
        let primerDia = new Date(anho,mes-1,1,0,0,0);
        let domingo = primerDia.getTime() - primerDia.getDay()*24*60*60*1000;
        for(let i=0;i<5;i++){
            let elDia = new Date(domingo);
            let nvasReservas = await getStatSemana(elDia.getFullYear(),elDia.getMonth()+1,elDia.getDate());
            let len = nvasReservas.length;
            for(let j=0;j<len;j++){
                let unaReserva = nvasReservas[j];
                if (!unaReserva.fecha.includes(""+anho+"-"+_mes)){
                    continue;
                }
                let dia = getDia(unaReserva.fecha);
                let hora = parseInt(unaReserva.hora)-8;
                stat[dia][hora]++;
            }
            domingo += 7*24*60*60*1000;
        }
        return stat;
    }
    return {
        iniciar: function(){
            return getUsuarios();
        },
        getVendedores: function(sucursal){
            let len = losVendedores.length;
            let res = [];
            for(let i=0;i<len;i++){
                if(losVendedores[i].sucursal === sucursal){
                    res.push(losVendedores[i]);
                }
            }
            return res;
        },
        getSucursales: function(){
            let len  = losVendedores.length;
            let res = [];
            for(let i=0;i<len;i++){
                if(res.indexOf(losVendedores[i].sucursal)<0){
                    res.push(losVendedores[i].sucursal);
                }
            }
            return res;
        },
        getMes: getMes,
        getStatMes: getStatMes,
        getStatTrim: async function(anho,trimestre){
            let mes = 1+(trimestre-1)*3;
            let stat = await getStatMes(anho,mes);
            let nstat = await getStatMes(anho,mes+1);
            for(let d=0;d<7;d++){
                for(let h=0;h<12;h++){
                    stat[d][h] += nstat[d][h];
                }
            }
            nstat = await getStatMes(anho,mes+2);
            for(let d=0;d<7;d++){
                for(let h=0;h<12;h++){
                    stat[d][h] += nstat[d][h];
                }
            }
            return stat;
        },
        getStatSem: async function(anho,semestre){
            let mes = 1+(semestre-1)*6;
            let stat = await getStatMes(anho,mes);
            for(let m=2;m<=6;m++){
                let nstat = await getStatMes(anho,m);
                for(let d=0;d<7;d++){
                    for(let h=0;h<12;h++){
                        stat[d][h] += nstat[d][h];
                    }
                }
            }
            return stat;
        },
        getStatAnho: async function(anho){
            let stat = await getStatMes(anho,1);
            for(let m=2;m<=12;m++){
                let nstat = await getStatMes(anho,m);
                for(let d=0;d<7;d++){
                    for(let h=0;h<12;h++){
                        stat[d][h] += nstat[d][h];
                    }
                }
            }
            return stat;
        },
        getMeses: async function(anhoi,mesi,anhof,mesf){
            if(anhoi > anhof){
                let aux = anhoi;
                anhoi = anhof;
                anhof = aux;
            }
            if(anhoi === anhof){
                if(mesi > mesf){
                    let aux = mesi;
                    mesi = mesf;
                    mesf = aux;
                }
            }
            let vecReservas = [];
            do {
                let nvasReservas = await getMes(anhoi,mesi);
                vecReservas = vecReservas.concat(nvasReservas);
                mesi++;
                if(mesi > 12){
                    mesi = 1;
                    anhoi++;
                }
                if(anhoi > anhof){
                    break;
                }
                if(anhoi === anhof){
                    if(mesi > mesf){
                        break;
                    }
                }
            } while(true);
            return vecReservas;
        },
        getVentasVendedor: function(id){
            let len = lasReservas.length;
            let res = [];
            for(let i=0;i<len;i++){
                if(lasReservas[i].vendedor === i){
                    res.push(lasReservas[i].vendedor);
                }
            }
            return res;
        },
        getVentasSucursal: function(sucursal){
            let len = lasReservas.length;
            let res = [];
            for(let i=0;i<len;i++){
                if(lasReservas[i].datosVendedor.sucursal === sucursal){
                    res.push(lasReservas[i].vendedor);
                }
            }
            return res;
        },
        getVentasTodas: function(){
            return lasReservas;
        }
    };
}());

function fun1(){
    
}

function fun2(){
    
}

function fun3(){
    
}

async function fun4(){
    
}

async function fun5(){
    
}
