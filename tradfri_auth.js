const tradfriLib = require("node-tradfri-client");
const TradfriError = tradfriLib.TradfriError;
const TradfriErrorCodes = tradfriLib.TradfriErrorCodes;
const TradfriClient = tradfriLib.TradfriClient;

const secrets = require("./secrets.json")
const ip = secrets.ip
const hostname = secrets.hostname
const securityCode = secrets.securityCode
const tradfri = new TradfriClient(ip);

tradfri.authenticate(securityCode).then((identity, psk)=> {
    console.log("started")
    console.log(identity)
    console.log(psk)
    })
    .catch((e) =>{
        if (e.code === TradfriErrorCodes.ConnectionFailed) {
                console.log("Gateway unreachable or security code wrong")
            }
        else if (e.code === TradfriErrorCodes.AuthenticationFailed) {
                console.log("Something went wrong with the authentication.")
                // It might be that this library has to be updated to be compatible with a new firmware.
            }
        }
    );