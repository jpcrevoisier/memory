var memory={
	currentGame: {
		selectedCard: null,
		timer: null,
		score: 90000,
		grid: null,
		pseudo: null,
	},
	oldGames : [
	],
	endGame: function (win)
	{
		clearInterval(this.currentGame.timer);
		game={
			pseudo: this.currentGame.pseudo,
			score: this.currentGame.score,
			grid: this.currentGame.grid
		};
		if(win)
		{
			this.oldGames.push(game);
			this.sortGames();
			endGameComment="Bravo "+game.pseudo+" !!!\ntu as gagné avec "+game.score+" points ...";
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.open("POST", "store.php");
			xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			xmlhttp.send(JSON.stringify(game));
		}
		else
		{
			progressValue=document.getElementById('progress').value;
			if(progressValue>0)
			{
				if(progressValue>1)
				{
					endGameComment="Désolé "+game.pseudo+",\ntu as perdu en trouvant "+progressValue+" paires ...";
				}
				else
				{
					endGameComment="Désolé "+game.pseudo+",\ntu as perdu en trouvant une paire ...";
				}
			}
			else
			{
				endGameComment="Désolé "+game.pseudo+",\ntu as perdu sans trouver de paire ...";
			}
		}
		endGameComment+='\nUne autre partie ?';
		if (confirm(endGameComment))
		{
			this.newGame();
		} else {
			this.showScores();
		}
	},
	checkMe: function (event)
	{
		document.getElementById('pseudo').setAttribute('contenteditable',false);
		this.currentGame.pseudo=document.getElementById('pseudo').innerText;
		if(this.currentGame.timer===null)
		{
			this.currentGame.timer=setInterval(function(game){
				game.currentGame.score=game.currentGame.score-50;
				document.getElementById('score').innerText=game.currentGame.score;
				if(game.currentGame.score<=0)
				{
					clearInterval(game.currentGame.timer);
					game.endGame();
				}
			}, 500, this);
		}
		var card = event.currentTarget;
		if (card.className === "card")
		{ // on test si c'est bien une carte qui a été sélectionnée ...
			if(card.style.transform == "rotateY(180deg)")
			{	// si la carte a déjà été retournée donc on ne fait rien ...
				return false;
			}
			// On affiche la carte
			card.style.transform = "rotateY(180deg)";
			if(this.currentGame.selectedCard)
			{	// si une précédente carte a été retournée
				// on compare les backgrounds pour déterminer si les cartes sont identiques
				if(this.currentGame.selectedCard.querySelector('.back').style.background==card.querySelector('.back').style.background)
				{	// si il sont identiques on ajoute un point 
					document.getElementById('progress').value++;
					if(document.getElementById('progress').value==document.getElementById('progress').max)
					{
						this.endGame(true);
					}
				}
				else
				{	// on retourne les deux cartes
					setTimeout(function(cardA,cardB)
					{
						cardA.style.transform = "rotateY(0deg)";
						cardB.style.transform = "rotateY(0deg)";
						clearTimeout(this);
					},500,this.currentGame.selectedCard,card);
				}
				this.currentGame.selectedCard=null;
			}
			else
			{	// sinon on retourne la carte 
				card.style.transform = "rotateY(180deg)";
				this.currentGame.selectedCard=card;
			}
		}

	},
	clearElement: function(target){
		if(target==undefined)
		{
			target=document.body;
		}
		while (target.firstChild)
		{   
		   target.removeChild(target.firstChild);
		}
	},
	newGrid: function()
	{
		availableSprite=new Array();
		for(i=0;i<18;i++)
		{
			availableSprite[i]=i;
		}
		availableCards=new Array();
		selectedCards=new Array();
		for(i=0;i<28;i++)
		{
			availableCards[i]=i;
			selectedCards[i]=null;
		}
		loopCountSecurity=0;
		// On va boucler tant qu'il restera des index libres
		while(availableCards.length>0)
		{
			loopCountSecurity++;
			// Cette condition est juste une sécurité pour ne pas mettre le navigateur en PLS avec un boucle infinie
			if(loopCountSecurity>2048)
			{ // Si cela arrive, on arrete tout !
				throw new Error("Erreur lors de la répartition des vignettes !");
			}
			// On choisi un sprite au hasard dans le tableau des sprites disponibles
			spriteIdx=parseInt(Math.random()*availableSprite.length);
			sprite=availableSprite[spriteIdx];
			// qu'on retire des sprites disponibles
			availableSprite.splice(spriteIdx,1);
			for(i=0;i<2;i++)
			{
				// On sélectione l'index d'une carte libre dans le tableau des cartes disponibles
				availableSlotIdx=parseInt(Math.random()*availableCards.length);
				// On recupère le slot libre auquel l'index fait référence toujours a partir du tableau 
				availableSlot=availableCards[availableSlotIdx];
				// On sauvegarde le sprit précédement séléctionné dans ce slot dans le tableau des cartes séléctionnées.
				selectedCards[availableSlot]=sprite;
				// On le retire des index disponibles
				availableCards.splice(availableSlotIdx,1);
			}
		}
		return selectedCards;
	},
	getScores: function()
	{
		var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance 
		xmlhttp.open("GET", "store.php");
		xmlhttp.onload=function(event)
		{
			if(xmlhttp.status === 200)
			{
				
				try {
					records=JSON.parse(xmlhttp.responseText);
				} catch (e) {
					return false;
				}
				for(s=0;s<records.datas.length;s++)
				{
					record=records.datas[s];
					memory.oldGames.push(record);
				}
				memory.sortGames();
			}
			else
			{
				console.warn('Une erreur est survenue lors de la récupération des scores !', xmlhttp.responseText);
			}
		};
		xmlhttp.send();
	},
	sortGames: function()
	{
		bestPlayers=[];
		for(var i in memory.oldGames)
		{
			bestPlayers[memory.oldGames[i].pseudo]=memory.oldGames[i];
		}
		for(var i in memory.oldGames)
		{
			if(bestPlayers[memory.oldGames[i].pseudo].score<memory.oldGames[i].score)
			{
			  bestPlayers[memory.oldGames[i].pseudo]=memory.oldGames[i];
			}
		}
		memory.oldGames=[];
		for(i in bestPlayers)
		{
		  memory.oldGames.push(bestPlayers[i]);
		}
		this.oldGames=this.oldGames.sort(function(a,b)
		{
			if ( a.score > b.score )
			{
				return -1;
			}
			if ( a.score < b.score )
			{
				return 1;
			}
			return 0;
		});
		localStorage.oldGames=JSON.stringify(this.oldGames);
	},
	byScore: function ( a, b )
	{
		if ( a.score > b.score )
		{
			return -1;
		}
		if ( a.score < b.score )
		{
			return 1;
		}
		return 0;
	},
	showScores: function()
	{
		this.clearElement();
		this.oldGames=JSON.parse(localStorage.oldGames);
		gameDivContent=document.createElement('div');
		document.body.appendChild(gameDivContent);
		gameDivContent.setAttribute('id','gameDivContent');
		mainGrid=document.createElement('div');
		gameDivContent.appendChild(mainGrid);
		mainGrid.setAttribute('id','mainGrid');
		mainGrid.classList.add("grid");
		scoreDiv=document.createElement('div');
		mainGrid.appendChild(scoreDiv);
		scoreDiv.setAttribute('id','scoreDiv');
		for(i=0;i<5;i++)
		{
			if(this.oldGames[i]!=undefined)
			{
				game=this.oldGames[i];
				div=document.createElement('div');
				scoreDiv.appendChild(div);
				div.classList.add('score');
				div.dataset.grid=game.grid;
				div.addEventListener('click',function(e){memory.newGame(e.target.dataset.grid);});
				div.appendChild(document.createTextNode(game.pseudo+' '+game.score+' 🎮'));
			}
		}
		newGameButton=document.createElement('input');
		gameDivContent.appendChild(newGameButton);
		newGameButton.value='Nouvelle partie';
		newGameButton.setAttribute('type','button');
		newGameButton.setAttribute('id','newGame');
		newGameButton.addEventListener('click',function(e){memory.newGame();});
	},
	newGame: function(selectedGrid)
	{
		this.clearElement();
		spriteIdxs=(selectedGrid!=undefined)?JSON.parse('['+selectedGrid+']'):this.newGrid();
		this.currentGame.grid=spriteIdxs;
		gameDivContent=document.createElement('div');
		gameDivContent.setAttribute('id','gameDivContent');
		mainGrid=document.createElement('div');
		mainGrid.setAttribute('id','mainGrid');
		mainGrid.classList.add("grid");
		row=document.createElement('div');
		row.classList.add('row');
		pseudo=document.createElement('div');
		pseudo.classList.add('pseudo');
		pseudoText=(this.currentGame.pseudo)?this.currentGame.pseudo:'Pseudo';
		pseudo.appendChild(document.createTextNode(pseudoText));
		pseudo.setAttribute('id', 'pseudo');
		pseudo.setAttribute('contenteditable',true);
		pseudo.addEventListener('focusout',function(e){memory.currentGame.pseudo=e.target.innerText;});
		
		row.appendChild(pseudo);
		score=document.createElement('div');
		score.classList.add('score');
		score.appendChild(document.createTextNode('0'));
		score.setAttribute('id', 'score');
		row.appendChild(score);
		mainGrid.appendChild(row);
		idx=0;
		for(r=0;r<4;r++)
		{
			row=document.createElement('div');
			row.classList.add('row');
			for(c=0;c<7;c++)
			{
				card=document.createElement('div');
				card.classList.add('card');
				card.addEventListener('click',function(e){memory.checkMe(e);});
				card.dataset.cardIdx=idx;
				card.dataset.spriteIdx=(spriteIdxs[idx]*-100);
				card.style.transform = "rotateY(0deg)";
				front=document.createElement('div');
				front.classList.add('front');
				card.appendChild(front);
				back=document.createElement('div');
				back.classList.add('back');
				back.setAttribute('style','background: url(cards.png) 0px '+(spriteIdxs[idx]*-100)+'px;');
				card.appendChild(back);
				row.appendChild(card);
				idx++;
			}
			mainGrid.appendChild(row);
		}
		gameDivContent.appendChild(mainGrid);
		progressBar=document.createElement('progress');
		progressBar.setAttribute('id', 'progress');
		progressBar.setAttribute('max', 14);
		progressBar.setAttribute('value', 0);
		gameDivContent.appendChild(progressBar);
		document.body.appendChild(gameDivContent);
	},
	init: function()
	{
		try
		{
			this.oldGames=JSON.parse(localStorage.oldGames);
		}
		catch(e)
		{
			localStorage.oldGames='[]';
			this.oldGames=JSON.parse(localStorage.oldGames);
		}
		this.getScores();
		this.showScores();
		return true;
	}
};
window.addEventListener("DOMContentLoaded", function(event){memory.init();});
