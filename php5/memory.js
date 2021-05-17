// Création de la classe memory
var memory={
	// Initialisation des variables
	currentGame: {
		selectedCard: null,
		timer: null,
		score: 90000,
		grid: null,
		pseudo: null,
	},
	oldGames : [
	],
	// Methode d'initialiation qui sera appelée au chargement du DOM
	init: function()
	{
		// On essai de charger le localStorage pour récupérer les scores des anciennes parties
		try
		{
			this.oldGames=JSON.parse(localStorage.oldGames);
		}
		catch(e)
		{
			// Si le localStorage est vide, on l'initalise avec un tableau vide
			localStorage.oldGames='[]';
			this.oldGames=JSON.parse(localStorage.oldGames);
		}
		// On lance la récupération des scores.
		this.getScores();
		this.showScores();
		return true;
	},
	getScores: function()
	{
		// On initialise l'objet xmlHttpRequest
		var xmlhttp = new XMLHttpRequest();
		// On precise la methode et l'url
		xmlhttp.open("GET", "store.php");

		xmlhttp.onload=function(event)
		{
			// Vérification du code HTTP 200 ( les autres codes indiquent des erreurs )
			if(xmlhttp.status === 200)
			{
				// On tente de parser la réponse en json
				try {
					records=JSON.parse(xmlhttp.responseText);
				} catch (e) {
					// On sort si ce n'est pas possible.
					return false;
				}
				// On pousse le contenue du tableau vers la variable contenant les scores
				for(s=0;s<records.datas.length;s++)
				{
					record=records.datas[s];
					memory.oldGames.push(record);
				}
				// et on lance le tri des scores.
				memory.sortGames();
			}
			else
			{
				// On log une erreur en cas de code différent de 200
				console.warn('Une erreur est survenue lors de la récupération des scores !', xmlhttp.responseText);
			}
		};
		// On envoi la requete HTTP.
		xmlhttp.send();
	},
	showScores: function()
	{
		// On efface le contenue de la page
		this.clearElement();
		// On charge la variable contenant les scores a partir du localStorage
		this.oldGames=JSON.parse(localStorage.oldGames);
		// Ici on utilise le dom pour créer l'interface.
		// Nous aurions pu simplifier en utilisant innerHTML au détriment des performances
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
		// On boucle 5 fois pour avoir les 5 meilleurs scores
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
	endGame: function (win)
	{
		// a la fin du jeu on nettoie le timer
		clearInterval(this.currentGame.timer);
		// On charge une variable avec les données du jeu en cours
		game={
			pseudo: this.currentGame.pseudo,
			score: this.currentGame.score,
			grid: this.currentGame.grid
		};
		// en cas de victoire
		if(win)
		{
			// On ajoute ce jeu au tableau des scores
			this.oldGames.push(game);
			this.sortGames();
			// On forge le message du gagnant et on pousse les données vers le serveur
			endGameComment="Bravo "+game.pseudo+" !!!\ntu as gagné avec "+game.score+" points ...";
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.open("POST", "store.php");
			xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			xmlhttp.send(JSON.stringify(game));
		}
		else
		{
			// En cas de défaite
			// On récupere le nombre de paires réalisées pour afficher le message correspondant
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
		// On propose une autre partie dans tout les cas
		endGameComment+='\nUne autre partie ?';
		if (confirm(endGameComment))
		{
			// Si oui on relance un jeu
			this.newGame();
		} else {
			// Sinon on réaffiche le tableau des scores.
			this.showScores();
		}
	},
	checkMe: function (event)
	{
		// C'est la fonction qui va vérifier qu'une paire est retournée.
		// On récupère la carte qui vient d'être sélectionnée
		document.getElementById('pseudo').setAttribute('contenteditable',false);
		// Et on affecte le pseudo choisi a la variable du jeu courant.
		this.currentGame.pseudo=document.getElementById('pseudo').innerText;
		// On lance le timer qui va décompter les points
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
	clearElement: function(target)
	{	// Méthode d'éffacement d'un noeud html
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
	{	// Méthode de création d'une grille
		availableSprite=new Array();
		// Il y'a 18 figures possibles dans le sprite fourni
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
	sortGames: function()
	{
		// On créer un tableau vide qui va receuillir les meilleur scores par pseudo.
		// C'est pas très gentil mais on ne va garder qu'un score par pseudo, sinon c'est tout le temps les même ... 
		bestPlayers=[];
		// Donc on créer une entrée par pseudo
		for(var i in memory.oldGames)
		{
			bestPlayers[memory.oldGames[i].pseudo]=memory.oldGames[i];
		}
		// et on compare les scores de chacune des entrées pour ne garder que le plus élevé
		for(var i in memory.oldGames)
		{
			if(bestPlayers[memory.oldGames[i].pseudo].score<memory.oldGames[i].score)
			{
			  bestPlayers[memory.oldGames[i].pseudo]=memory.oldGames[i];
			}
		}
		// On effeca le contenue des parties enregistrées
		memory.oldGames=[];
		// Et on y pousse celles des meilleurs joueurs.
		for(i in bestPlayers)
		{
		  memory.oldGames.push(bestPlayers[i]);
		}
		// On trie les entrées avec une fonction de comparaison des scores
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
		// et on stocke ces informations dans le localStorage
		localStorage.oldGames=JSON.stringify(this.oldGames);
	},
	newGame: function(selectedGrid)
	{
		// Affichage d'une nouvelle grille ou d'une grille précédente
		// On efface la page
		this.clearElement();
		// et on affecte soit une nouvelle grille soit celle sélectionnée.
		spriteIdxs=(selectedGrid!=undefined)?JSON.parse('['+selectedGrid+']'):this.newGrid();
		this.currentGame.grid=spriteIdxs;
		// Utilise encore le dom pour créer l'interface.
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
};
// On lance l'affichage des intterfaces une fois que le dom est chargé
window.addEventListener("DOMContentLoaded", function(event){memory.init();});
