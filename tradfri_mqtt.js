/*
MIT License
Copyright (c) 2019 Arttu Laapotti

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

const tradfriLib = require("node-tradfri-client");
const TradfriError = tradfriLib.TradfriError;
const TradfriErrorCodes = tradfriLib.TradfriErrorCodes;
const TradfriClient = tradfriLib.TradfriClient;


const auth = require("./auth.json")
const secrets = require("./secrets.json")



const ip = secrets.ip
const hostname = secrets.hostname
const securityCode = secrets.securityCode
const mqtt = require("mqtt");
const mqtt_ip = secrets.mqtt_ip
const client = mqtt.connect("mqtt://"+ mqtt_ip, mqttOptions);


const tradfri = new TradfriClient(ip);
var lights = {};


function device_updated(device){
    if(device.type == 2){ //is lightbulb
        lights[device.name] = device
        
        
        //publishing available lights 
        client.publish("info/lights/tradfri", JSON.stringify(Object.keys(lights)));
        console.log("mqtt message fired! topic: " + "info/lights/tradfri" + ", payload: " + JSON.stringify(Object.keys(lights)));
        
        if(device.lightList){
            
            let topic = "info/light/tradfri";
            let state = "";
            let colorTemp = "";
            let color = "";
            let spectrum = device.lightList[0].spectrum;


            if(device.lightList[0].onOff){
                state = "on";
            }
            else{
                state = "off";
            }
            
            
            if(spectrum == "white"){
                colorTemp = device.lightList[0].colorTemperature;
            }
            if(spectrum == "rgb"){
                color =  device.lightList[0].color;
                colorTemp = device.lightList[0].colorTemperature;
            }
            let payload = {name: device.name, state: state, spectrum: spectrum, color: color,
                 colorTemp: colorTemp, dimmer: device.lightList[0].dimmer };
            
            client.publish(topic, JSON.stringify(payload));
            
            console.log("mqtt message fired! topic: " + topic + ", payload: " + JSON.stringify(payload));
        }
    }
}

function device_removed(device){
    if(device.type == 2){ //is lightbulb
        delete lights[device.name];
    }
}

function ping_gw() {
    tradfri.ping().then((result)=>{
        console.log("ping result: "+ result)});
}

tradfri.connect(auth.identity, auth.psk)
    .then((result) => {
        console.log("promise")
        console.log(result)
        ping_gw();
        //main async reactions
        tradfri.on("device updated", device_updated)
        tradfri.on("device removed", device_removed)
        tradfri.observeDevices();
        //ping gateway for CoAP connection keep-alive
        setInterval(function(){
            ping_gw()},7500);
        
    })
    .catch((e) => {
        console.log("error")
        console.log(e)
        // TO-DO: handle error
});


client.on("connect", function () {
    console.log("mqtt connected..");
    client.subscribe("cmd/light/tradfri");
    
  });
   
client.on("message", function (topic, message) {
// message is a Buffer
// react to subscribed MQTT events
    try {
        let device_id = JSON.parse(message.toString()).name
        console.log("mqtt message received! topic: " +topic.toString() + " device: "
            + device_id + " with message: " + message.toString());
        alterState(device_id, message);
    }
    catch(err){
        console.log(err)
    }
});


function setParameters(message){
    //sets parameters for system call
    //TO-DO: check if provided parameters are within bounds
    try {
        let param = JSON.parse(message.toString());
        let operation ={};
        let state;
        //toggle state
        if (param["state"] == "on"){
            state = true;
        }
        else if (param["state"] == "off"){
            state = false;
        }
        else{
            console.log("errr: invalid state")
            return 0;
        }
        
        operation.onOff = state;
        //if dimmer parameter is provided alter dimmer
        if(param["dimmer"]){
            operation.dimmer = param["dimmer"]
        }

        //if color temperature parameter is provided alter colortemp
        if(param["colorTemp"]){
            if(param["colorTemp"] == 0){
                operation.colorTemperature = 1; //bug? 0 doesn't change value
            }
            else{
                operation.colorTemperature = param["colorTemp"]
            }
        }
        //if color parameter is provided alter color accordinggly
        if(param["color"]){
            operation.color = param["color"]
        }
        return operation
    }
    catch(err){
        console.log(err)
    }
 

}


function alterState(device_id, message){
      //check if device is present in the gateway
    if(lights.hasOwnProperty(device_id)){
        //operating lights with info parsed from mqtt message
        tradfri.operateLight(lights[device_id], setParameters(message));

    }
    else{
        console.log("device id not found from the list")
    }
}  


