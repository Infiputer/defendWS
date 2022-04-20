const WebSocket = require('ws');
const server = new WebSocket.Server({
    port: 8080
});
function idGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+S4()+S4()+S4()+S4()+S4()+S4());
}
players = []
leaderboard = {}

function addCastles(n){
	for(i = 0; i < n; i++){
		players.push({
        "health": 100,
        "x": (Math.random()-0.5)*10000,
        "y": (Math.random()-0.5)*10000,
				"type": "castle",
				"owner": "none",
				"ownername": "None",
				"angle": Math.random()*6.28,
				"id":players.length+"-"+idGenerator()
		})
	}
}



addCastles(30)

guardaddangle = 0

colors = ["red", "orange", "yellow", "green", "blue"]
server.on('connection', function(socket) {
    players.push({
			"name": "unknown",
			"score": 1,
			"health": 100,
			"x": 0,
			"y": 0,
			"color":colors[Math.floor(Math.random()*colors.length)],
			"angle": 0,
			"socket": socket,
			"type": "player",
			"id":players.length+"-"+idGenerator(),
			"guards":[],
			"lastMessage":Date.now()
    });

    socket.on('message', function(msgb) {
        playerindex = -1;
        players.forEach(function(player, index) {
            if (player["socket"] == socket) {
                playerindex = index
            }
        })
        msg = msgb.toString()
        if (msg.startsWith("name")) {
					numToAdd = 0
					players.forEach(function(x){
						if((msg.substring(5)+((numToAdd==0)?"":numToAdd)) == x["name"]){
							numToAdd++
						}
					})
					
					players[playerindex]["name"] = msg.substring(5)+((numToAdd==0)?"":numToAdd)
					console.log(players[playerindex]["name"])
					players[playerindex]["socket"].send("id "+players[playerindex]["id"])
        }
        if (msg.startsWith("move")) {
					playpos = msg.substring(5).split(",")
					players[playerindex]["x"] = parseInt(playpos[0])
					players[playerindex]["y"] = parseInt(playpos[1])
        }
			  if (msg.startsWith("angle")) {
					players[playerindex]["angle"] = parseInt(msg.substring(6))
        }
				if(msg.startsWith("arrow")){
					arrowpos = msg.substring(6).split(",")
					players.push({
						"x":parseInt(arrowpos[0])+Math.cos(parseFloat(arrowpos[2]))*80,
						"y":parseInt(arrowpos[1])+Math.sin(parseFloat(arrowpos[2]))*80,
						"angle":parseFloat(arrowpos[2]),
						"type":"arrow",
						"travel":0,
						"owner":players[playerindex]["id"],
						"id":idGenerator()
					})
				}
				sendmessage = JSON.stringify(players.map(
						function(p) {
								return {
									"x": p["x"],
									"y": p["y"],
									"name": p["name"],
									"health": p["health"],
									"score": p["score"],
									"color": p["color"],
									"angle":p["angle"],
									"type":p["type"],
									"ownername":p["ownername"],
									"guards":p["guards"],
									"id":p["id"]
								}
						}
				), null, '\t')
        players.forEach(function(play, index) {
					if(play["type"]=="player"){
						play["socket"].send(sendmessage)
					}
        });


        socket.on('close', function() {
            players = players.filter(s => s["socket"] !== socket);
        });
    })
});


function getDistance(x1, y1, x2, y2) {
		let y = x2 - x1;
		let x = y2 - y1;
		return Math.sqrt(x * x + y * y);
}


setInterval(function(){
	for(index = 0; index < players.length; index++){
		if(players[index]["type"]=="arrow"){
			players[index]["x"]+=Math.cos(players[index]["angle"])*50
			players[index]["y"]+=Math.sin(players[index]["angle"])*50
			players[index]["travel"]+=4;

			for(pstrike = 0; pstrike < players.length; pstrike++){
				if(players[pstrike]["type"]=="player" || players[pstrike]["type"]=="castle"){
					if(
						getDistance(
							players[pstrike]["x"],
							players[pstrike]["y"],
							players[index]["x"],
							players[index]["y"]
						)<150
					){
						if(players[pstrike]["type"]=="castle"){
							if(players[pstrike]["owner"] != players[index]["owner"]){
								players[pstrike]["health"]-=5
							}
						}
						else{
							players[pstrike]["health"]-=5
						}
						
						if(players[pstrike]["type"]=="castle" && players[pstrike]["health"]<1){
							ownername = ""
							players.forEach(function(x){
								if(x["id"] == players[index]["owner"]){
									ownername = x["name"]
								}
							})
							players[pstrike]["owner"] = players[index]["owner"]
							players[pstrike]["ownername"] = ownername
							players[pstrike]["health"] = 100
						}
						players[index]["travel"]+=190
					}
				}

				if(
					getDistance(
						players[pstrike]["x"],
						players[pstrike]["y"],
						players[index]["x"],
						players[index]["y"]
					)<20
					&& players[pstrike]["type"] == "arrow" 
					&& players[pstrike]["id"] != players[index]["id"]
					){
						players[index]["angle"]-=(Math.random()-0.5)
						players[index]["travel"]-=50
						players[pstrike]["travel"]-=50
					}
			}
		}
		if(players[index]["type"]=="player" || players[index]["type"]=="castle"){
			if(players[index]["health"]<99){
				players[index]["health"]+=0.1
			}
		}
	}

	players = players.filter(function(x){
		if(x["type"]=="player"){
			if(x["health"]<0){
				x.socket.send("lose")
				return false;
			}
			return true;
		}
		if(x["travel"]>200){
			return false;
		}
		return true;
	})
}, 50)




setInterval(function(){
	leaderBoard = {}
	idBoard = {}
	players.forEach(function(x){
		if(x["type"] == "castle" && x["ownername"]!="None"){
			if(isNaN(leaderBoard[x["ownername"]])){
				leaderBoard[x["ownername"]]=0
				idBoard[x["owner"]]=0
			}
			leaderBoard[x["ownername"]]++
			idBoard[x["owner"]]++
		}
	});
	players.forEach(function(x, index){
		if(x["type"]=="player" && idBoard[x["id"]]>0){
			players[index]["guards"] = []
			console.log("helo")
			gap = 6.28/idBoard[x["id"]];
			for(angle = 0; angle < 6.28; angle += gap){
				players[index]["guards"].push([
					Math.cos(angle+guardaddangle)*400+players[index]["x"],
					Math.sin(angle+guardaddangle)*400+players[index]["y"]
				])
			}
			console.log(gap)
		}
		guardaddangle+=0.01
	}, 50)
	console.log(players.length)
	console.log(leaderBoard)


	stringboard = JSON.stringify(leaderBoard, null, '\t')
	
	players.forEach(function(play, index) {
		if(play["type"]=="player"){
			play["socket"].send("leader "+stringboard)
		}
	});
}, 1000)

setInterval(function(){
	players.forEach(function(play, index){
		if(play["type"] == "castle"){
			players[index]["x"]+=Math.cos(play["angle"]+(Math.random()-0.5))*10
			players[index]["y"]+=Math.sin(play["angle"]+(Math.random()-0.5))*10
		
			if(Math.abs(play["x"])>5000 || Math.abs(play["y"])>5000){
				players[index]["angle"] = play["angle"]-3.141
			}
		}
	})
}, 100)



process.on('uncaughtException', (error)  => {
 console.log('Error',  error);
})