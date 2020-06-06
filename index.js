const Discord = require('discord.js');
const client = new Discord.Client();
const firebase = require("firebase/app");
var fs = require('fs');

// Add the Firebase products that you want to use
require("firebase/auth");
require("firebase/firestore");


const prefix = "!";
var firebaseConfig = {
    apiKey: "AIzaSyB3N7NF2DOr_RfYBDd8s873L6Enb2-yq7E",
    authDomain: "discord-dnd-manager.firebaseapp.com",
    databaseURL: "https://discord-dnd-manager.firebaseio.com",
    projectId: "discord-dnd-manager",
    storageBucket: "discord-dnd-manager.appspot.com",
    messagingSenderId: "734911824315",
    appId: "1:734911824315:web:03573cf9047ffe4cbe049e",
    measurementId: "G-29CJXL395W"
};
firebase.initializeApp(firebaseConfig);
let db = firebase.firestore();

var server;

client.once('ready', () => {
    console.log(`${client.user.tag} is Ready!!`);
});

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot || !(message.content.indexOf("dnd") > 0)) return;
    console.log("Message:", message.content);

    const args = message.content.slice(prefix.length).split(' ');
    const command = args.shift().toLowerCase();
    var res = "Err";
    switch (command) {
        case "dnd-add-game":
            if (message.member.roles.cache.some(role => role.name === 'dm')) {
                addGame(message.guild.id, message.author.id, args, res => {
                    message.channel.send(res);
                });
            } else {
                message.channel.send("Sorry! You have to have the 'dm' role to make a game.");
            }
            break;
        case "dnd-game-info":
            gameData(message.guild.id, message.content.slice(command.length + 2), res => {
                message.channel.send(res);
            })
            break;
        case "dnd-game-characters":
            gameCharacters(message.guild.id, message.content.slice(command.length + 1), res => {
                message.channel.send(res);
            })
            break;
        case "dnd-add-character":
            var stats = message.content.slice(prefix.length);
            addCharacter(message.guild, message.author, stats.slice(command.length + 1), res => {
                message.channel.send(res);
            })
            break;
        case "dnd-my-characters":
            myCharacters(message.guild.id, message.author, res => {
                message.channel.send(res);
            })
            break;
        case "dnd-set-session":
            if (message.member.roles.cache.some(role => role.name === 'dm')) {
                setSession(message.guild.id, message.author, message.content.slice(command.length + 2), res => {
                    message.channel.send(res);
                });
            } else {
                message.channel.send("Sorry! You have to have the 'dm' role to set a session time.");
            }
            break;
        case "dnd-schedule":
            schedule(message.guild.id, res => {
                message.channel.send(res);
            })
            break;
        case "dnd-help":
            fs.readFile('commands.txt', 'utf8', function (err, data) {
                if (err) throw err;
                message.channel.send(data);
            });
            break;
        default:
            var res = "Sorry! I don't know that command :( try !dnd-help to see a list!";
            message.channel.send(res);
    }

    // var res = "Check";
});

function addGame(server, dm, game, callback) {
    var name = caps(game);
    db.collection('servers').doc(server).collection('games').doc(name).get().then(snap => {
        if (snap.exists) {
            callback("Sorry! This game already exists!");
        }
        else {
            db.collection('servers').doc(server).collection('games').doc(name).set({
                name: name,
                dm: dm
            }).then(ref => {
                callback(`Okay! The game **'${name}'** has been added :)`);
            });
        }
    })
}
function addCharacter(server, author, content, callback) {
    content = content.split(" / ");
    var keys = ["game", "name", "race", "class", "level"];
    var char = {};

    for (var i = 0; i < keys.length; i++) {
        var stat = "";
        var words = content[i].split(" ");
        words.forEach(word => {
            stat += word.replace(word[0], word[0].toUpperCase());
            stat += " ";
        });
        char[keys[i]] = stat.trim();
    }
    char["player"] = author.id;
    console.log(char);

    db.collection('servers').doc(server.id).collection('games').doc(char.game).get().then(snap => {
        if (!snap.exists) {
            callback("Sorry! This game doesn't exist!");
        }
        else {
            db.collection('servers').doc(server.id).collection('characters').doc(char.name).get().then(snap => {
                if (!snap.exists) {
                    db.collection('servers').doc(server.id).collection('characters').doc(char.name).set(char).then(() => {
                        callback(`Okay ${author}!\n**${char.name}** has been added to **${char.game}**, they are a **${char.race} Level ${char.level} ${char.class}**.\n*Type !dnd-char-commands to see what else you can do with your character!*`);
                    });
                }
                else {
                    callback("Sorry, a character already exists by this name!");
                }
            })
        }
    })
}
function allGames() {

}
function deleteGame() {

}
function deleteCharacter() {

}
function setSession(server, author, args, callback) {
    console.log(typeof args);
    if (!(args.indexOf(" / ") > 0)) {
        callback("I think you sent the wrong perameters there!");
    }
    else {

        args = args.split(" / ");
        var name = caps(args[0]);

        var dates = args[1].split(" ");
        var today = new Date();
        var d = new Date(today.getFullYear(), dates[1] - 1, dates[0], dates[2], dates[3]);

        db.collection('servers').doc(server).collection('games').doc(name).get().then(snap => {
            if (!snap.exists) {
                callback("Sorry! This game doesn't exist!");
            }
            else {
                db.collection('servers').doc(server).collection('games').doc(name).update({
                    nextSession: d.getTime()
                }).then(() => {
                    callback(`Okay ${author}!\n The next game of **${name}** is on **${d.toDateString()}**`)
                })
            }
        });
    }
}
function myCharacters(server, author, callback) {
    console.log(author.id);
    db.collection("servers").doc(server).collection("characters").where("player", "==", author.id).get().then(snapshot => {
        if (snapshot.empty) {
            callback(`Sorry! You don't have any characters yet!`);
        }
        else {
            var res = `**${author}'s Characters:**\n------------------------------\n`
            snapshot.forEach(snap => {
                console.log(snap.data(), author.id);
                res += `**Name:** ${snap.data().name}\n**Race:** ${snap.data().race}\n**Class:** ${snap.data().class}\n**Level:** ${snap.data().level}\n**Game:** ${snap.data().game}\n------------------------------\n`
            })
            callback(res);
        }
    })
}
function gameCharacters(server, content, callback) {
    var name = caps(content.trim());
    db.collection('servers').doc(server).collection('games').doc(name).get().then(snap => {
        if (!snap.exists) {
            callback("Sorry! This game doesn't exist!");
        }
        else {
            db.collection('servers').doc(server).collection('characters').where("game", "==", name).get().then(snap => {
                if (snap.empty) {
                    callback(`Sorry! There are no characters in this game`);
                }
                else {
                    var res = `**${name} Characters:**\n--------------------\n`
                    snap.forEach(s => {
                        user = client.users.cache.get(s.data().player);
                        res += `**Name:** ${s.data().name}\n**Race:** ${s.data().race}\n**Class:** ${s.data().class}\n**Level:** ${s.data().level}\n**Player:** ${user}\n------------------------------\n`
                    })
                    callback(res);
                }
            })
        }
    });
}
function gameData(server, content, callback) {
    var name = caps(content);
    db.collection('servers').doc(server).collection('games').doc(name).get().then(snap => {
        if (!snap.exists) {
            callback("Sorry! This game doesn't exist!");
        }
        else {
            db.collection('servers').doc(server).collection('games').doc(name).get().then(snap => {
                console.log(snap.data());
                var date = (snap.data().nextSession == undefined) ? "No session set" : snap.data().nextSession;
                user = client.users.cache.get(snap.data().dm);
                var res = `**Name:** ${snap.data().name}\n**DM:** ${user}\n**Next Session:** ${date}`;
                callback(res);
            })
        }
    });
}
function schedule(server, callback) {
    db.collection("servers").doc(server).collection("games").get().then(snapshot => {
        if (snapshot.empty) {
            callback(`There are no games at the moment`);
        }
        else {
            var dates = [];
            var games = [];
            var today = new Date();
            today = today.getTime();

            snapshot.forEach(snap => {
                var d = new Date(snap.data().nextSession);
                if (d != "Invalid Date") {
                    dates.push(d.getTime());
                    games.push(snap.data());
                }
            })

            dates.sort(function (a, b) { return a - b });
            var res = `**Upcoming Schedule**\n-------------\n`;
            for (var x = 0; x < dates.length; x++) {
                games.forEach(g => {
                    var d = new Date(g.nextSession);
                    if (d.getTime() == dates[x] && d.getTime() > today) {
                        var date = (d.toDateString()).split(" , " + d.getFullYear());
                        if (d.getMinutes() == 0) {
                            res += `**${date} at ${d.getHours()}:${d.getMinutes()}0:** ${g.name}\n`;
                        }
                        else {
                            res += `**${date} at ${d.getHours()}:${d.getMinutes()}:** ${g.name}\n`;
                        }
                    }
                })
            }
            console.log(res);
            callback(res);
        }
    })
}

function caps(text) {
    var word = "";
    if (typeof text != "object") {
        text = text.split(" ");
    }
    text.forEach(t => {
        word += t.replace(t[0], t[0].toUpperCase());
        word += " ";
    })
    return word.trim();
}

client.login('NzE4ODY3NTY0Mjg1MTMyODUy.XtvHrA.B62F1uR8z98JKxaa9r_akw9LjrM');