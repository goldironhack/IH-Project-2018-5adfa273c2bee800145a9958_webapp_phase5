const boroughs = "http://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson";
const dSecureNbh = "https://data.cityofnewyork.us/resource/qgea-i56i.json?$where=cmplnt_fr_dt=%222015-12-31T00:00:00%22";
const housingCost = "https://data.cityofnewyork.us/api/views/hg8x-zxpr/rows.json?accessType=DOWNLOAD";
const dhousingCost = "https://data.cityofnewyork.us/resource/hg8x-zxpr.json?$select=borough,community_board,extremely_low_income_units";
const nyNbhoodNames = "https://data.cityofnewyork.us/resource/xyye-rtrs.json?$select=borough,name,the_geom";
const geoDistricts = "https://data.cityofnewyork.us/resource/q2z5-ai38.json?";
const NYY ="https://data.cityofnewyork.us/resource/xyye-rtrs.json?";

var map; //variable that stores the DOM tag where the map goes in html
var nYork = new Coordinate(40.730610, -73.935242);//location downtown new york
var university = new Coordinate(40.729059, -73.996527);
var unMarker;//university marker
var housingData={"datos":[]};//data on housing projects
var JGeo;

var datass4 =$.getJSON(boroughs, function (){
    console.log("crimenes");
    console.log(datass4);
    JGeo=boroughs;
 });

// var datass =$.get(NYY, function (){
//     console.log("barrios");
//     console.log(datass);
// });

// var datass1 =$.get(dhousingCost, function (){
//     console.log("costoVivienda");
//     console.log(datass1);
// });

// var datass2 =$.get(dSecureNbh, function (){
//     console.log("crimenes");
//     console.log(datass2);
// });

var datosBarrios = [[122,129,130,251],[119,123,124,125],[102,120,121,250],[115,118],[116,252,278],
[117,128,275,276,277],[113,114,126],[109,110,111,112,249,273],[105,106,127],[107],[108],[103,104],
[20,21,22],[23,24],[25,269,270],[19,43,271],[14,15,16,272],[17,18,34],[8,13],[3,4,5,6,35,36],
[26,27,30,40,44],[28,29,31,38,39],[11,32,33,42],[0,2,7,9,10,41,45],[49,61,96,97,98],[64,69,86],
[63],[62],[72,95,262],[66,68,70],[48,58],[55,59,283],[88,224],[46,81,101],[47,79],[57,80,100],
[51,78,85],[54,92],[52,291],[60,89],[56,225],[94,264],[188,268],[142,280],[133,143],[134,191],
[145,292],[147,198],[152,186],[160,161],[139,148],[135,149,150,189],[153,163],[166,168],[164,170,190],
[178,179,180,181],[221,228],[205,211,294],[216,239,244]];
console.log(datosBarrios);


var datass2 =$.get(nyNbhoodNames, function (){
    console.log("barrios");
    console.log(datass2);
    console.log(datass2.responseJSON[0].the_geom.coordinates);
});


// objeto para guardar numeros maximos de parametros
var maximos = {
    security:0,
    cost:0,
    distance:0
}

// Variable que almacena los datos de todos los diostritos
var dataDistricts = {
    districts:[]
};

// variable que mapea información del los distritos
var keyDistricts = {};

var dataOrderDistricts = {
    security: [],
    cost: [],
    distance: [],
    total: []
};

//))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// Defiicion de clase coordenadas
function Coordinate(lat,lng){
    this.lat = lat;
    this.lng = lng;
};

//Definicion de clase Neighborhood
function Neighborhood(name, borough, coordinates){
    this.name = name;
    this.borough = borough;
    this.coordinates = coordinates;
};

// Definicion de clase Distritos.
function District (id,code){
    this.id = id;
    this.code = code;
    this.name = "";
    this.pos = new Coordinate(0,0);
    this.secure = 0;
    this.nLowCost = 0;
    this.distance = 0;
    this.scoreSecure = 0;
    this.scoreCost = 0;
    this.scoreDistance = 0;
    this.totalScore = 0;
}

var dataNBhoods ={
    boroughs:[]
};


//)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// calcula el centro de cada distrito
function calcCenterDistrict (){
    return new Promise(function(resolve,reject){
        var dataBarrios =$.get(nyNbhoodNames, function (){
            for (var i = 0; i < datosBarrios.length; i++){
                var lat = 0;
                var lng = 0;
                for (var j = 0; j < datosBarrios[i].length; j++){
                    lat = lat + dataBarrios.responseJSON[datosBarrios[i][j]].the_geom.coordinates[1]
                    lng = lng + dataBarrios.responseJSON[datosBarrios[i][j]].the_geom.coordinates[0]
                }
                dataDistricts.districts[i].pos.lat = lat/datosBarrios[i].length;
                dataDistricts.districts[i].pos.lng = lng/datosBarrios[i].length;
            }
            resolve();
        });
    });
}

//)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// funcion que calcula la distancia entre dos puntos 
function getDistanceBTpoints (lat1,lon1,lat2,lon2){
    function rad(x) {return x*Math.PI/180;}
    var R = 6378.137; //Radio de la tierra en km
    var dLat = rad( lat2 - lat1 );
    var dLong = rad( lon2 - lon1 );
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong/2) * Math.sin(dLong/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d.toFixed(3); //Retorna tres decimales
}

//))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

function calcDistance (){
    return new Promise(function(resolve,reject){
        var posDistrict;
        var posUniversity= new google.maps.LatLng(university.lat, university.lng);
        var result;
        for (var i = 0; i< dataDistricts.districts.length; i++ ){
            posDistrict = new google.maps.LatLng( dataDistricts.districts[i].pos.lat, dataDistricts.districts[i].pos.lng);
            result = getDistanceBTpoints(dataDistricts.districts[i].pos.lat,dataDistricts.districts[i].pos.lng, university.lat, university.lng);
            dataDistricts.districts[i].distance = parseFloat(result);
        }
        resolve();
    });
}

        
//)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// funcion que crea el objetio con todos los distritos
function createDistricts() {
    return new Promise(function(resolve,reject){
        console.log("inicio");
        var ndistXboro = [0,12,12,18,14,3];
        var boro = ["","MN-","BX-","BK-","QN-","SI-"];
        var code = ["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18"];
        var cont = 0;
        for (var i = 1; i<6; i++){
            for(var j = 1; j<ndistXboro[i]+1; j++){
                dataDistricts.districts.push(new District((100*i)+j,boro[i]+code[j]));
                keyDistricts[boro[i]+code[j]]=cont;
                cont++;
            }
        }
        console.log(dataDistricts);
        console.log(keyDistricts[dataDistricts.districts[24].code]);
        console.log("fin");

        // calcCenterDistrict().then(calcDistance).then(ordenarDistritos);
        resolve();
    }); 
}

//))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))
function ordenarDistritos(){
    return new Promise(function(resolve,reject){
        orderDistricts(1);
        orderDistricts(2);
        orderDistricts(4);
        resolve();
    });
    
}
function orderDistricts (opcion){
        switch(opcion) {
            case 1:// ordenar por costo
                for (var i=0; i<dataDistricts.districts.length; i++){
                    dataOrderDistricts.cost.push(dataDistricts.districts[i]);   
                }
                dataOrderDistricts.cost.sort(function(a,b){
                    if(a.scoreCost > b.scoreCost){
                        return -1;
                    }
                    if(a.scoreCost < b.scoreCost){
                        return 1;
                    } 
                        return 0;
                });
                break;
    
            case 2: // ordenar por distancia
                for (var i=0; i<dataDistricts.districts.length; i++){
                    dataOrderDistricts.distance.push(dataDistricts.districts[i]);   
                }
                dataOrderDistricts.distance.sort(function(a,b){
                return (b.scoreDistance - a.scoreDistance);
                });
                break;
    
            case 3:// ordenar por seguridad
                for (var i=0; i<dataDistricts.districts.length; i++){
                    dataOrderDistricts.security.push(dataDistricts.districts[i]);   
                }
                dataOrderDistricts.security.sort(function(a,b){
                if(a.scoreSecure > b.scoreSecure){
                    return 1;
                }
                if(a.scoreSecure < b.scoreSecure){
                    return -1;
                } 
                    return 0;
                });
                break;
    
            case 4: // ordenar por costo + distancia + seguridad
                for (var i=0; i<dataDistricts.districts.length; i++){
                    dataOrderDistricts.total.push(dataDistricts.districts[i]);   
                }
                dataOrderDistricts.total.sort(function(a,b){
                if(a.totalScore > b.totalScore){
                    return -1;
                }
                if(a.totalScore < b.totalScore){
                    return 1;
                } 
                    return 0;
                });
                break;
            default:
        }    
}

//))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// funcion que dibuja los marcadores de los distritos en el mapa
function dibujar(){
    for (var i=0; i<dataDistricts.districts.length; i++){
        unMarker = new google.maps.Marker({
            position: dataDistricts.districts[i].pos,
            title: "Distrito: "+dataDistricts.districts[i].code+"\nidDistrito: "+i,
            map : map
        });
    }
}

//))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// funcion que obtiene los datos de las unidades de vivienda de bajo costo por distrito
function getDataHousingCost(){
    return new Promise(function(resolve,reject){
        console.log("inicio");
        var dataHC = $.get(dhousingCost, function (){
            for(var i = 0; i<dataHC.responseJSON.length; i++){
                dataDistricts.districts[keyDistricts[dataHC.responseJSON[i].community_board]].nLowCost = 
                dataDistricts.districts[keyDistricts[dataHC.responseJSON[i].community_board]].nLowCost + parseInt(dataHC.responseJSON[i].extremely_low_income_units); 
            }
            console.log(dataDistricts);
            console.log(keyDistricts);
            console.log("fin");
            dibujar();
            resolve();
            
        });
    });
}

//))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// funcion que calcula el maximo de costo seguridad y distancia
function calculateMaxScore (){
    return new Promise(function(resolve,reject){
        console.log("inicio");
        var max1 = 0;
        var max2 = 0;
        var max3 = 0;
        console.log(dataDistricts.districts.length);
        for(var i = 0; i<dataDistricts.districts.length; i++){
            if(max1 < dataDistricts.districts[i].nLowCost ){
                max1 = dataDistricts.districts[i].nLowCost;
            }
            if(max2 < dataDistricts.districts[i].distance ){
                max2 = dataDistricts.districts[i].distance;
            }
            if(max3 < dataDistricts.districts[i].secure ){
                max3 = dataDistricts.districts[i].secure;
            }
        }
        maximos.cost = max1;
        maximos.distance = max2;
        maximos.security = max3;
        console.log(maximos);
        console.log("fin");
        resolve();    
    });   
}

//)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// funcion que calcula el procentaje de cada distrito en costo 
function calculateTotalScore (){
    return new Promise(function(resolve,reject){
        for(var i=0; i < dataDistricts.districts.length; i++){
            dataDistricts.districts[i].scoreCost = (dataDistricts.districts[i].nLowCost*100)/maximos.cost;
            dataDistricts.districts[i].scoreDistance = (-100/maximos.distance)*(dataDistricts.districts[i].distance-maximos.distance);
            dataDistricts.districts[i].totalScore = dataDistricts.districts[i].scoreCost + dataDistricts.districts[i].scoreDistance + dataDistricts.districts[i].scoreSecure;
        }
        console.log("inicio");
        console.log(dataDistricts.districts);
        console.log("fin");
        resolve();
    });
}

//))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))

// funcion obtener datos de los barrios.
function getDataNBhoods (URL) {
    var dataJson = $.get(URL,function(){
        console.log(dataJson);
        var name, borough, lat, lng, coordinates;
        for(var i =0; i<dataJson.responseJSON.length; i++){
            name = dataJson.responseJSON[i].name;
            borough = dataJson.responseJSON[i].borough;
            lat = dataJson.responseJSON[i].the_geom.coordinates[1];
            lng = dataJson.responseJSON[i].the_geom.coordinates[0];
            coordinates = new Coordinate(lat,lng);
            dataNBhoods.boroughs.push(new Neighborhood(name,borough,coordinates));
        }
        console.log(dataNBhoods);
    })
};

//--function that paints the table with the most affordable housing projects in newyork
function updateTable(){
    var housingTemp = $.get(housingCost).done(function(){
        housingData.datos.push(housingTemp.responseJSON.data);
        fillTable(housingData);
    });
};

// llenar tabla
function fillTable (fillData){
    tableReference =$("#mainTableBody")[0];
    var newRow, borough, latitude, lngitude, nhouse;
    for(i=0; i<fillData.datos[0].length; i++){
        newRow = tableReference.insertRow(tableReference.rows.length);
        borough = newRow.insertCell(0);
        latitude = newRow.insertCell(1);
        lngitude = newRow.insertCell(2);
        nhouse = newRow.insertCell(3);
    
        borough.innerHTML = fillData.datos[0][i][15];
        latitude.innerHTML = fillData.datos[0][i][23];
        lngitude.innerHTML = fillData.datos[0][i][24];
        nhouse.innerHTML = fillData.datos[0][i][31];
    }
}

function makeTables (){//funcion para crear y llenar el cuerpo de las tablas
    return new Promise(function(resolve,reject){
        tReferenceDistance =$("#mtbodyDistance")[0];
        tReferenceCost =$("#mtbodyCost")[0];
        tReferenceSecurity =$("#mtbodySecurity")[0];
        tReferenceBestDistricts =$("#mtbodyBestDistrics")[0];

        var newRow, numero, distrito;
        for(var i=0; i<10; i++){//tabla de distritos mas cercanos
            newRow = tReferenceDistance.insertRow(tReferenceDistance.rows.length);
            numero = newRow.insertCell(0);
            distrito = newRow.insertCell(1);
            numero.innerHTML = i+1;
            distrito.innerHTML = dataOrderDistricts.distance[i].code;
        }
        for(var i=0; i<10; i++){//tabla de distritos mas baratos
            newRow = tReferenceCost.insertRow(tReferenceCost.rows.length);
            numero = newRow.insertCell(0);
            distrito = newRow.insertCell(1);
            numero.innerHTML = i+1;
            distrito.innerHTML = dataOrderDistricts.cost[i].code;
        }
        for(var i=0; i<10; i++){// tabla de los distritos mas seguros
            newRow = tReferenceSecurity.insertRow(tReferenceSecurity.rows.length);
            numero = newRow.insertCell(0);
            distrito = newRow.insertCell(1);
            numero.innerHTML = i+1;
            distrito.innerHTML = dataOrderDistricts.cost[i].code;
        }
        for(var i=0; i<3; i++){// tabla de los 3 mejores distritos
            newRow = tReferenceBestDistricts.insertRow(tReferenceBestDistricts.rows.length);
            numero = newRow.insertCell(0);
            distrito = newRow.insertCell(1);
            numero.innerHTML = i+1;
            distrito.innerHTML = dataOrderDistricts.total[i].code;
        }
        resolve();
    });    
}

function mostrarTabla(){

    var vDistance = document.getElementById("cDistance").checked;
    var vCost = document.getElementById("cCost").checked;
    var vSecurity = document.getElementById("cSecurity").checked;
    console.log(vDistance);
    console.log(vCost);
    console.log(vCost);

    if( vDistance == true && vCost == false && vSecurity == false){
        document.getElementById("tDistance").style.display == "block";
        document.getElementById("tCost").style.display == "none";
        document.getElementById("tSecurity").style.display == "none";
        document.getElementById("tBestDistrics").style.display == "none";
    }
    if( vDistance == false && vCost == true && vSecurity == false){
        document.getElementById("tDistance").style.display == "none";
        document.getElementById("tCost").style.display == "block";
        document.getElementById("tSecurity").style.display == "none";
        document.getElementById("tBestDistrics").style.display == "none";
    }
    if( vDistance == false && vCost == false && vSecurity == true){
        document.getElementById("tDistance").style.display == "none";
        document.getElementById("tCost").style.display == "none";
        document.getElementById("tSecurity").style.display == "block";
        document.getElementById("tBestDistrics").style.display == "none";
    }
    if( vDistance == true && vCost == true && vSecurity == true){
        document.getElementById("tDistance").style.display == "none";
        document.getElementById("tCost").style.display == "none";
        document.getElementById("tSecurity").style.display == "none";
        document.getElementById("tBestDistrics").style.display == "block";
    }
            
}

function mostrarDistancia (){
    document.getElementById("tDistance").style.display == "block";
    document.getElementById("tCost").style.display == "none";
    document.getElementById("tSecurity").style.display == "none";
    document.getElementById("tBestDistrics").style.display == "none";
}
function mostrarCosto (){
    document.getElementById("tDistance").style.display == "none";
        document.getElementById("tCost").style.display == "block";
        document.getElementById("tSecurity").style.display == "none";
        document.getElementById("tBestDistrics").style.display == "none";
}
function mostrarSeguridad (){
    document.getElementById("tDistance").style.display == "none";
        document.getElementById("tCost").style.display == "none";
        document.getElementById("tSecurity").style.display == "block";
        document.getElementById("tBestDistrics").style.display == "none";
}
function mostrarMejor (){
    document.getElementById("tDistance").style.display == "none";
        document.getElementById("tCost").style.display == "none";
        document.getElementById("tSecurity").style.display == "none";
        document.getElementById("tBestDistrics").style.display == "block";
}

//-------------Load information on Google Maps-----------------------------------

function setPos(){
    for (var i=0; i<dataNBhoods.boroughs.length; i++){
        unMarker = new google.maps.Marker({
            position: dataNBhoods.boroughs[i].coordinates,
            title: "Barrio: "+dataNBhoods.boroughs[i].name+"\nDistrito: "+dataNBhoods.boroughs[i].borough+"\nidBarrio: "+i,
            map : map
        });
    }
}

function loadGoogleMap() {
    return new Promise(function(resolve,reject){
        map = new google.maps.Map(document.getElementById('gMapContainer'), {
            zoom: 10,
            center: nYork,
            mapTypeId: 'terrain'
        });    
        unMarker = new google.maps.Marker({
            position: university,
            title:"NYU Stern School of Business",
            map : map
        });
        
        map.data.loadGeoJson(boroughs);
        map.data.setStyle(function(feature){
            var color='white';
            for (var i =101; i<505; i++){
                if(feature.getProperty('BoroCD')==i && i>100 && i<113){
                    color='red';
                }
                if(feature.getProperty('BoroCD')==i && i>200 && i<213){
                    color='blue';
                }
                if(feature.getProperty('BoroCD')==i && i>300 && i<319){
                    color='green';
                }
                if(feature.getProperty('BoroCD')==i && i>400 && i<415){
                    color='yellow';
                }
                if(feature.getProperty('BoroCD')==i && i>500 && i<504){
                    color='violet';
                }
            } 
            return ({
                fillColor:color
            });   
        });
        createDistricts().then(calcCenterDistrict).then(calcDistance).then(getDataHousingCost).then(calculateMaxScore).then(calculateTotalScore).then(ordenarDistritos).then(makeTables);
        resolve();
    });
}

//Update table---------------------------------------------------------------


//show table's information 
function mostrarTablaVivienda(){
    document.getElementById("housingCost").style.display = "block";
}

//show and hide information  depending from state
function muestra_oculta(){
    getDataNBhoods(nyNbhoodNames);
    updateTable();

    if (document.getElementById){ //se obtiene el id
        var el = document.getElementById("housingCost"); //se define la variable "el" igual a nuestro div
        el.style.display = (el.style.display == 'none') ? 'block' : 'none'; //damos un atributo display:none que oculta el div
    }

    if (document.getElementById){ //se obtiene el id
        var el = document.getElementById("stadistics"); //se define la variable "el" igual a nuestro div
        el.style.display = (el.style.display == 'none') ? 'block' : 'none'; //damos un atributo display:none que oculta el div
    }
}

//---------------------------------------------------------------------------



$(document).ready(function(){
    console.log(dataOrderDistricts);
    $("#bDistance").on("click",mostrarDistancia);
    $("#bCost").on("click",mostrarCosto);
    $("#bSecurity").on("click",mostrarSeguridad);
    $("#bMejor").on("click",mostrarMejor);
    
    $("#showDtaHousing").on("click",muestra_oculta);
//    $.getJSON(boroughs, function (){
//         console.log("crimenes");
//         console.log(datass4);
//         JGeo=boroughs;
//      });
//      polyCreateEx();
})


// function polyCreateEx(){
//     var polyArray =[];
//     for(var i=0; i<JGeo.responseJSON.features[0].geometry.coordinates.length;i++){
//         if(JGeo.responseJSON.features[0].geometry.coordinates[i]!=null){
//             var locator = new google.maps.LatLng(JGeo.responseJSON.features[0].geometry.coordinates[0][i][1],
//                 JGeo.responseJSON.features[0].geometry.coordinates[0][i][0]);
//             polyArray.push(locator);
//             console.log(locator);
//         }
//         var polygon = google.maps.Polygon({paths:polyArray});
//         console.log(polygon);
//     }

// }