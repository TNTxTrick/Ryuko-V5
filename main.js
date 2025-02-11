const { addUser, rmStates } = require('./main/system/editconfig.js');
const log = require("./main/utility/logs.js");
const logger = require("./main/utility/logs.js");
const axios = require("axios");
const chalk = require('chalk');
const { readdirSync, readFileSync, writeFileSync } = require("fs-extra");
const { join, resolve } = require('path')
const { execSync, exec } = require('child_process');
const configLog = require('./main/utility/config.json');
const login = require("./main/system/ws3-fca/index.js");
const listPackage = JSON.parse(readFileSync('package.json')).dependencies;
const packages = JSON.parse(readFileSync('package.json'));
const fs = require("fs-extra");
const process = require('process');
const moment = require("moment-timezone");

global.client = new Object({
    commands: new Map(),
    events: new Map(),
    accounts: new Map(),
    cooldowns: new Map(),
    mainPath: process.cwd(),
    eventRegistered: new Array(),
    configPath: new String(),
    envConfigPath: new String(),
    handleSchedule: new Array(),
    handleReaction: new Array(),
    handleReply: new Array()
});

global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
});

global.config = new Object();
global.envConfig = new Object();
global.accounts = new Array();
global.nodemodule = new Object();
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();
global.utils = require('./main/utility/utils.js');
global.send = require("./main/utility/send.js");


var configValue;
try {
    const configPath = "./config.json";
    global.client.configPath = configPath;
    configValue = require(global.client.configPath);
    log(`loading ${chalk.blueBright(`config`)} file.`, "load");
} catch (err) {
    return log(`cant load ${chalk.blueBright(`configPath`)} in client.`, "error");
    process.exit(0);
}
try {
    for (const Keys in configValue) global.config[Keys] = configValue[Keys];
    log(`loaded ${chalk.blueBright(`config`)} file.`, "load");
} catch (err) {
    return log(`can't load ${chalk.blueBright(`config`)} file.`, "error");
    process.exit(0)
}


const langFile = (readFileSync(`${__dirname}/main/utility/languages/${global.config.language}.lang`, {
    encoding: 'utf-8'
})).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
    const getSeparator = item.indexOf('=');
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1, item.length);
    const head = itemKey.slice(0, itemKey.indexOf('.'));
    const key = itemKey.replace(head + '.', '');
    const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] == "undefined") global.language[head] = new Object();
    global.language[head][key] = value;
}
global.getText = function(...args) {
    const langText = global.language;
    if (!langText.hasOwnProperty(args[0])) {
        throw new Error(`${__filename} - not found key language : ${args[0]}`);
    }
    var text = langText[args[0]][args[1]];
    if (typeof text === 'undefined') {
        throw new Error(`${__filename} - not found key text : ${args[1]}`);
    }
    for (var i = args.length - 1; i > 0; i--) {
        const regEx = RegExp(`%${i}`, 'g');
        text = text.replace(regEx, args[i + 1]);
    }
    return text;
};


var accountsValue;
try {
    const accountsPath = global.config.bots;
    accountsValue = accountsPath;
    log(global.getText('main', 'accountload', chalk.blueBright('accounts')), "load");
} catch (err) {
    return log(global.getText('main', 'accounterr', chalk.blueBright('accounts'), err), "err");
    process.exit(0);
}
try {
    for (let i = 0; i < accountsValue.length; i++) 
        global.accounts[i] = accountsValue[i]
    log(global.getText('main', 'loadedacc', chalk.blueBright('accounts')), "load");
} catch (err) {
    log(global.getText('main', 'accounterr', chalk.blueBright('accounts'), err), "load");
}

var envconfigValue;
try {
    const envconfigPath = "./main/config/envconfig.json";
    global.client.envConfigPath = envconfigPath;
    envconfigValue = require(global.client.envConfigPath);
} catch (err) {
    process.exit(0);
}
try {
    for (const envKeys in envconfigValue) global.envConfig[envKeys] = envconfigValue[envKeys];
} catch (err) {
    process.exit(0)
}


const{ Sequelize, sequelize } = require("./main/system/database/index.js");
const { kStringMaxLength } = require('buffer');
const { error } = require('console');
for (const property in listPackage) {
    try {
        global.nodemodule[property] = require(property)
    } catch (e) { }
}



if (!global.config.email) {
    logger(global.getText('main', 'emailNotfound', chalk.blueBright('config.json')), 'err');
    process.exit(0);
}
if (!global.config.prefix) {
    logger(global.getText('main', 'prefixNotfound', chalk.blueBright('config.json')), "err");
}

const commandsPath = "./script/commands";
const commandsList = readdirSync(commandsPath).filter(command => command.endsWith('.js') && !global.config.disabledcmds.includes(command));

console.log(chalk.blue(global.getText('main', 'startloadCmd')));
for (const command of commandsList) {
    try {
        const module = require(`${commandsPath}/${command}`);
        const { config} = module;
        if (!config?.name) {
            try {
                throw new Error(global.getText("main", "cmdNameErr", chalk.red(command)));
            } catch (err) {
                logger.commands(err.message);
                continue;
            }
        }
        if (!config?.category) {
            try {
                throw new Error(global.getText("main", "cmdCategoryErr", chalk.red(command)));
            } catch (err) {
                logger.commands(err.message);
                continue;
            }
        }
        if (global.config.premium) {
            if (!config?.premium) {
                try {
                    throw new Error(global.getText("main", "premiumCmdErr", chalk.red(command)));
                } catch (err) {
                    logger.commands(err.message);
                    continue;
                }
            }
        }
        if (!config?.hasOwnProperty('prefix')) {
            try {
                throw new Error(global.getText("main", "prefixCmdErr", chalk.red(command)), "error");
            } catch (err) {
                logger.commands(err.message);
                continue;
            }
        }
        if (global.client.commands.has(config.name || "")) {
            try {
                throw new Error(global.getText("main", "commandNameExist", chalk.red(command)));
            } catch (err) {
                logger.commands(err.message);
                continue;
            }
        }


        if (module.handleEvent) global.client.eventRegistered.push(config.name);
        global.client.commands.set(config.name, module);
        logger.commands(global.getText("main", "commands", chalk.blueBright(command)));
    } catch (err) {
        logger.commands(global.getText("main", "cmderr", chalk.red(command), err));
        continue;
    }
}



const evntsPath = "./script/events";
const evntsList = readdirSync(evntsPath).filter(events => events.endsWith('.js') && !global.config.disabledevnts.includes(events));
console.log(`${chalk.blue(`\n${global.getText("main", "startloadEvnt")}`)}`)
for (const ev of evntsList) {
    try {
        const events = require(`${evntsPath}/${ev}`);
        const { config, onLoad, run } = events;
        if (!config || !config?.name ) {
            try {
                throw new Error(global.getText("main", "failedEvnt", chalk.red(ev)));
            } catch (err) {
                logger.events(err.message);
                continue;
            }
        }
        if (global.client.events.has(config.name || "")) {
            try {
                throw new Error(global.getText("main", "evNameExist", chalk.red(ev)));
            } catch (err) {
                logger.events(err.message);
                continue;
            }
        }
        global.client.events.set(config.name, events);
        logger.events(global.getText("main", "events", chalk.blueBright(ev)));
    } catch (err) {
        logger.events(global.getText("main", "evnterr", chalk.red(ev)));
        continue;
    }
}

async function startLogin(appstate, { models: botModel }, filename) {
    return new Promise(async (resolve, reject) => {
        try {
            await login(appstate, (err, api) => {
                if (err) {
                    reject(err); 
                }
                (async ()=> {
                    const userId = await api.getCurrentUserID();
                    const info = (await api.getUserInfo(userId))[userId];
                    const name = info.name;
                    log.login(global.getText("main", "successLogin", chalk.blueBright(filename)));

                    addUser(name, userId);
                    global.client.accounts.set(userId, filename);

                    global.client.api = api;
                    

                    const cmdsPath = "./script/commands";
                    const cmdsList = readdirSync(cmdsPath).filter(command => command.endsWith('.js') && !global.config.disabledcmds.includes(command));
                    for (const cmds of cmdsList) {
                        try {
                            const module = require(`${cmdsPath}/${cmds}`);
                            const { config, onLoad} = module;
                            if (onLoad) {
                                const moduleData = {};
                                moduleData.api = api;
                                moduleData.models = botModel;

                                module.onLoad(moduleData);

                            }
                            if (config.envConfig) {
                                const moduleName = config.name;
                                global.configModule[moduleName] = global.configModule[moduleName] || {};
                                global.envConfig[moduleName] = global.envConfig[moduleName] || {};
                                for (const envConfigKey in envConfig) {
                                    global.configModule[moduleName][envConfigKey] = global.envConfig[moduleName][envConfigKey] ?? envConfig[envConfigKey];
                                    global.envConfig[moduleName][envConfigKey] = global.envConfig[moduleName][envConfigKey] ?? envConfig[envConfigKey];
                                }
                                var envConfigPath = require("./main/config/envconfig.json");
                                var configPah = "./main/config/envconfig.json";


                                envConfigPath[moduleName] = config.envConfig;


                                fs.writeFileSync(configPah, JSON.stringify(envConfigPath, null, 4), 'utf-8');

                            }
                            if (config.envConfig) {
                                fs.writeFileSync(cjcjcc); // do not remove this, yes this is error but if you remove this, multiple appstate won't work
                            }

                        } catch (err) {
                           
                            resolve(err);



                        }
                    }
                })(),
                    (async () => {
                        const eventsPath = "./script/events";
                        const eventsList = readdirSync(eventsPath).filter(events => events.endsWith('.js') && !global.config.disabledevnts.includes(events));
                        for (const ev of eventsList) {
                            try {
                                const events = require(`${eventsPath}/${ev}`);

                                const { config, onLoad, run } = events;
                                if (onLoad) {
                                    const eventData = {};
                                    eventData.api = api,
                                        eventData.models = botModel;
                                    onLoad(eventData);
                                }
                            } catch (err) {
                                reject(`someting went wrong : ${err}`);



                            }
                        }
                    })();
                const listenerData = {};
                listenerData.api = api;
                listenerData.models = botModel;
                global.custom = require('./custom.js')({ api: api });
    
                const listener = require('./main/system/listen.js')(listenerData);
                global.handleListen = api.listenMqtt(async (error, message) => {
                    if (error) {
                        reject(`error listen: ${error}`);
                    }
                    if (['presence', 'typ', 'read_receipt'].some(data => data === message.type)) return;
                    return listener(message);
                });


            });
        } catch (err) {
            reject(err); 
        }
    });
}

async function loadBot(botData) {
    const appstatePath = './states';
    const listsAppstates = readdirSync(appstatePath).filter(Appstate => Appstate.endsWith('.json'));
    console.log(chalk.blue('\n'+global.getText("main", "loadingLogin")));
    let hasErrors = false; 
    try {
        for (const states of listsAppstates) {
            try {

                if (fs.readFileSync(`${appstatePath}/${states}`, 'utf8').trim() === '') {
                    console.error(chalk.red(global.getText("main", "appstateEmpty", states)));
                    rmStates(path.parse(states).name);
                    continue;
                }

                let data = `${appstatePath}/${states}`;
                const appstateData = JSON.parse(fs.readFileSync(data, "utf8"));

                const loginDatas = {};
                loginDatas.appState = appstateData;
                try {
                    log.login(global.getText("main", "loggingIn", chalk.blueBright(states)));
                    await startLogin(loginDatas, botData, states);
                } catch (err) { 
                    log.login(global.getText("main", "loginErr", chalk.red(states), chalk.red(err)));
                    hasErrors = true;
                }
            } catch (err) {
                log.login(global.getText("main", "loginErr", chalk.red(states), chalk.red(err)));
                hasErrors = true;
            }
        }

        if (hasErrors) {
            global.send("login error", global.getText("main", "loginErrencounter"));
        }
    } catch (err) {
    }
}
async function startAi(model) {
    await loadBot(model);
}



async function on() {
    console.log(chalk.blue(`\n${global.getText("main", "loadingDatabase")}`));
    try {
        await sequelize.authenticate();
        const authentication = {};
        const chalk = require('chalk');
        authentication.Sequelize = Sequelize;
        authentication.sequelize = sequelize;
        const models = require('./main/system/database/model.js')(authentication);
        log.database(global.getText("main", "databaseLoaded", chalk.blueBright('database')));
        log.database(global.getText("main", "data1"));
        log.database(global.getText("main", "data2"));;
        log.database(global.getText("main", "data3"));
        const botData = {};
        botData.models = models;
        startAi(botData);
    } catch (error) { log(global.getText("main", "cantDeployData", chalk.red('database'), chalk.red(error)), "err") }
}
on();
