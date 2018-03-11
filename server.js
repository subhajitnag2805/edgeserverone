var express = require('express');
const SerialPort = require('serialport-v4');
var mongoose = require('mongoose');
var cors = require('cors');
var bodyParser = require('body-parser');
var axios = require('axios');

let id;
let port = new SerialPort('/dev/ttyACM0', {
    baudRate: 115200,
    parser: SerialPort.parsers.readline('\r\n')
});

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

/**
 * Import vitalStats model
*/
let vitalStats = require('./models/vitalStats');

/**
 * connect to mongodb
*/
// mongoose.connect('mongodb://127.0.0.1:27017/edge');
mongoose.connect('mongodb://test:password@ds211558.mlab.com:11558/ionic_chat');

//on successful connection
mongoose.connection.on('connected', () => {
    console.log('Connected to mongodb!!');
});

//on error
mongoose.connection.on('error', (err) => {
    if (err) {
        console.log('Error in db is :' + err);
    }
});

//middleware
app.use(cors());
//body-parser
app.use(bodyParser.json());

/**Update baudrate for blood presure  */
function updatePortBP() {
    port.update({
        baudRate: 19200
    }, function (data) {
        console.log("port updated to 19200");
    });
}

/**Update baudrate for normal presure  */
function updatePortNormal() {
    port.update({
        baudRate: 115200
    }, function (data) {
        console.log("port updated to 115200");
    });
}

io.on('connection', function (client) {
    console.log("Socket connected !");
    let status;
    client.on("start", function (data) {
        status = data.status;
        console.log("status :", status);
        /**
         * Body Temparature Measurement
         * Taking temperature as input from frontend in String format
         *
         * Send 1 from node.js to arduino for communication 
         */
        if (status == "temperature") {
            let count = 0;
            port.update({
                baudRate: 115200
            }, function (data) {
                console.log("port updated to 115200");
            });
            let interval = setInterval(function () {
                count++;
                let buffer = new Buffer(1);
                buffer.writeInt8(1);
                port.write(buffer, function (error) {
                    if (error) {
                        console.log("Temperature error :", error);
                    } else {
                        console.log("Temperature :", buffer.toString('hex'));
                    }
                });
                console.log(count);
                if (count == 241) {
                    clearInterval(interval);
                }
            }, 1000);
        }
        /**
         * Glucometer Measurement
         * Taking glucometer as input from frontend in String format
         *
         * Send 2 from node.js to arduino for communication
         */
        if (status == "glucometer") {
            port.update({
                baudRate: 115200
            }, function (data) {
                console.log("port updated to 115200");
            });
            let buffer = new Buffer(1);
            buffer.writeInt8(2);
            port.write(buffer, function (error) {
                if (error) {
                    console.log("glucometer error :", error);
                } else {
                    console.log("glucometer :", buffer.toString('hex'));
                }
            });
        }
        /**
         * BP Measurement
         * Taking bp as input from frontend in String format
         *
         * Send 3 from node.js to arduino for communication
         */
        if (status == "bp") {
            port.update({
                baudRate: 115200
            }, function (data) {
                console.log("port updated to 115200");
            });
            let buffer = new Buffer(1);
            buffer.writeInt8(3);
            port.write(buffer, function (error) {
                if (error) {
                    console.log("bp error :", error);
                } else {
                    console.log("bp :", buffer.toString('hex'));
                    if (buffer.toString('hex')) {
                        port.update({
                            baudRate: 19200
                        }, function (data) {
                            console.log("port updated to 19200");
                        });
                    }
                }
            });
        }
    });
    port.on('data', function (data) {
        console.log("arduino data :", data);
        client.emit('value',
            { "value": data, "status": status });
    });
});

/**
 * Routings
 */

/**
 * User registration and login
 *
 * id:String
 * name:String
 * email:String
 * loginTime:String
 * 
 */
app.post('/registration', function (request, response) {
    console.log("User data :");
    console.log(request.body);

    let userDetails = {};
    let name = request.body.name;
    let email = request.body.email;
    let individualId = request.body.individualId;

    /**calling rest api for meme server
     * post operation
    */

    //header
    let axiosConfig = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    let data = new vitalStats();
    data.name = name;
    data.email = email;
    data.individualId = individualId;

    data.save(function (error, result) {
        if (error) {
            userDetails.error = true;
            userDetails.message = `User details not saved.`;
            response.status(404).json(userDetails);
        } else if (result) {
            userDetails.error = false;
            userDetails.userRegistration = result;
            userDetails.message = `User Registration Details.`;
            response.status(200).json(userDetails);

            axios.post('https://memeapi.memeinfotech.com/vital/create', {
                "name": name,
                "email": email,
                "individualId": individualId,
                "createdBy": individualId,
                "updatedBy": individualId
            }, axiosConfig)
                .then(function (result) {
                    console.log("result :", result.data);

                    //after post data to memeserver id is
                    id = result.data.result._id;
                    console.log("id :", id);
                }).catch(function (error) {
                    console.log("error :", error);
                });
        }
    });
});

/**
 *
 * Save sensor values
 * time:String
 * temperature:String
 * "gsr":{
 *  "conductance":"",
 *  "resistance":"",
 *  "conductanceVol":""
 * }
 */
app.put('/sensorValues', function (request, response) {
    console.log("request.body :");
    console.log(request.body);

    let details = {};

    /**For measuring temperature*/
    let temperature = request.body.temperature;

    /**For measuring GSR*/
    let gsr = request.body.gsr;

    /**For measuring glucometer */
    let glucometer = request.body.glucometer;

    /**For measuring body position */
    let bodyposition = request.body.bodyposition;

    /**For measuring ECG */
    let ecg = request.body.ecg;

    /**For measuring EMG */
    let emg = request.body.emg;

    /**For measuring airflow */
    let airflow = request.body.airflow;

    /**For measuring snore */
    let snore = request.body.snore;

    /**For measuring bp */
    let bp = request.body.bp;

    /**For measuring spirometer */
    let spirometer = request.body.spirometer;

    /**calling rest api for meme server
     * post operation
    */

    //header
    let axiosConfig = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    vitalStats.findOne({ _id: request.body._id }, function (error, res) {
        if (error) {
            details.error = true;
            details.message = `User not found.`;
            response.status(404).json(details);
        } else if (res) {
            /**temperature
             * post data to local database
             * post data to meme server
             */
            if (temperature) {
                //post temperature data to local database
                res.stats.push({
                    "temperature": temperature
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "temperature": temperature
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }

            if (gsr) {
                res.stats.push({
                    "gsr": gsr
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "gsr": gsr
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }
            if (glucometer) {
                res.stats.push({
                    "glucometer": glucometer
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "glucometer": glucometer
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }
            if (bodyposition) {
                res.stats.push({
                    "bodyposition": bodyposition
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "bodyposition": bodyposition
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }
            if (ecg) {
                res.stats.push({
                    "ecg": ecg
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "ecg": ecg
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }
            if (emg) {
                res.stats.push({
                    "emg": emg
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "emg": emg
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }
            if (bp) {
                res.stats.push({
                    "bp": bp
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "bp": bp
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }

            if (airflow) {
                res.stats.push({
                    "airflow": airflow
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "airflow": airflow
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }

            if (snore) {
                res.stats.push({
                    "snore": snore
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "snore": snore
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }
            if (spirometer) {
                res.stats.push({
                    "spirometer": spirometer
                });

                //update data to memeserver
                axios.put('https://memeapi.memeinfotech.com/vital/update', {
                    "_id": id,
                    "stats": {
                        "spirometer": spirometer
                    }
                }, axiosConfig)
                    .then(function (result) {
                        console.log("result :", result.data);
                    }).catch(function (error) {
                        console.log("error :", error);
                    });
            }
            res.save(function (error, result) {
                if (error) {
                    details.error = true;
                    details.message = `Sensor details not saved.`;
                    response.status(404).json(details);
                } else if (result) {
                    details.error = false;
                    details.sensorDetails = result;
                    details.message = `Sensor Details.`;
                    response.status(200).json(details);
                }
            });
        }
    });
});

const PORT = 7000;
server.listen(PORT, function () {
    console.log("Server started");
});
