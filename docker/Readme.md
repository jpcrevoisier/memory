/!\ Attention /!\

Pour les éventuelles personnes d'O'Clock qui viendraient sur cette page, il ne faut pas tenir compte de la partie Docker que j'ai réalisée ici. Elle est hors délai par rapport a la deadline du mail de Juliette. J’ai juste voulu terminer l'image que j'avais commencée à réaliser, et m'étant pris au jeu, je vais pousser l'exrcice un peu plus loin 😁

---

# Utilisation de Docker pour le projet memory [O'Clock](http://oclock.io)


## Sommaire

* [Docker, Docker-compose ... quoi et pourquoi ?](#dockerWhatAndWhy)
* [Php / Mysql dans une image unique](#PhpMysqlDocker)
    * [Le déroulement](#deroulementPhpMysql)
    * [Explication du Dockerfile](#dockerfilePhpMysql)
    * [Explication du init.sh](#initPhpMysql)
    * [Commandes docker](#commandesPhpMysql)
* [Php / Sqlite image unique](#phpSqliteDocker)
* [Php / Mysql Docker-compose](#phpMysqlCompose)
* [Nginx / Php / Mysql Docker-compose](#nginxPhpMysqlCompose)


## Docker, Docker-compose ... quoi et pourquoi ? <a name="dockerWhatAndWhy"></a>

Techniquement plusieurs choix s’offrent a nous, pour différentes raisons de praticité, de sécurité, de poids et ou de flexibilité.

L'option numéro un : passer par une image contenant les deux services en n'exposant que l'un d'eux. Si techniquement ce type d'installation est intéressant, d'un point de vue opérationnel, elle est à bannir car nous n'avons pas de visibilité sur le fonctionnement de mysql, ce qui peut être problématique. Cela reste cependant une option adaptée pour une démonstration technique. La taille est réduite, le lancement simplifié, c'est moyennement sécurisé, on n'expose qu'un service mais il est clairement destiné a des tests, de la démonstartion, et pas du tout a des fins de production. Je ne m'embêterais d'ailleurs pas a renseigner un compte utilisateur ou même un mot de passe root, ce qui sera par contre le cas pour les options trois et quatre.

L'option numéro deux : même ça ne correspond plus exactement au cahier des charges, est de réaliser une image avec uniquement PHP et sqlite pour se passer de mysql ( Ce qui reste le meilleur choix technique dans un but de démonstration ). Forcément, il faudrat modifier notre code php pour passer par PDO, beaucoup plus flexible et supportant mysql et sqlite.

Les options trois et quatre : passer par Docker-compose et monter dans un premier temps deux puis trois images avec des services distincts. L'intéret ici est d'utiliser différentes images et donc disposer des différents services qui peuvent être exploités par d'autres applicatifs. C'est la solution la plus flexible, la plus professionelle, la plus lourde et la plus sensible en terme de sécurité ( oui, plus on expose de services, plus on doit faire attentions a leurs sécurité ). Je parle ici de deux puis de  trois images différentes, car tout va dépendre de ce que nous voulons monter comme services et ce qui devrait être accéssible depuis l'exterieur de notre Docker. Deux images, pour mysql et php built in server. Trois images pour mysql, nginx et php-fpm ce qui représente clairement la vesrion la plus élaborée et la plus professionelle de notre exercice.

Je vais réaliser ici les quatres exercices pour que vous puissiez les comparer en commençant par l'installation des deux services dans une image. Le but ici est de partir sur une image docker la plus petite possible, d'ou le choix d'une Alpine, et de n'y installer que le strict minimum. J'ai volontairement fait le choix de ne pas exposer mysql et d'utiliser le php built in server en lieu et place d'un vrai serveur tel qu'apache ou nginx.



Pour l'instant, je n'ai réalisé que le premier exercice mais je reviens très vite avec les autres 😁

## Exercice n°1 : Php / Mysql dans une image unique <a name="PhpMysqlDocker"></a>

### Le déroulement <a name="deroulementPhpMysql"></a>

D'un point de vue pratique, l'installation de mysql et de php en tant que service sur une même image n'est pas une bonne idée. Il est d'usage de séparer les deux et de ne les rassembler qu'a travers un Docker-compose tel que nous le verrons dans les exercices 3 et 4, mais lancons nous quand même pour tester tout ca. Nous allons partir de l'image d'une Alpine pour sa légerté et nous allons installer tour a tour, mysql puis php. 

### Explication du [Dockerfile](https://github.com/jpcrevoisier/memory/raw/main/docker/phpmysql/Dockerfile) <a name="dockerfilePhpMysql"></a>

On part d'une [Alpine](https://alpinelinux.org/)

	FROM alpine:latest

On lance la mise a jour du système, l'installation des paquets nécessaires et on néttoie le répertoire du cache.

    RUN apk update && \
     apk upgrade && \
     apk add php7-cli php7-json php7-mysqli mysql mysql-client && \
     rm -rf /var/cache/apk/*

On change de répertoire de travail

	WORKDIR /memory

On créer le répertoire qui va accuieillir le socket

	RUN mkdir /run/mysqld

On lance la procédure de finalisation de mysql en lui indiquant ou stocker les bases

	RUN mariadb-install-db --datadir /var/lib/mysql

On copie notre répertoire de travail

	COPY ./root /memory

Et on indique le script a lancer

	CMD [ "/bin/ash","/memory/init.sh" ]


### Explication du [init.sh](https://github.com/jpcrevoisier/memory/raw/main/docker/phpmysql/root/init.sh) <a name="initPhpMysql"></a>


On déclare le sheebang ash puisque nous somme sur une [Alpine](https://alpinelinux.org/), donc [Busybox](https://fr.wikipedia.org/wiki/BusyBox).

	#!/bin/ash

On test l'existence de la variable $mysql_host, si elle n'est pas présente ou vide on l'export avec notre parametre local et on precise l'argument a passer au client mysql.

    if ! test $mysql_host ;
    then
    	export mysql_host='localhost';
    fi;
    test_host="-h $mysql_host";

Si la valeur de la variable $mysql_host est localhost, on tente de démarrer notre serveur local en redirigeant stderr vers stdout et stdout vers un fichier de log.

    if [ "$mysql_host" = "localhost" ];
    then
    	/usr/bin/mysqld --user=root > /memory/log/mysqld.start.log 2>&1 &
    fi;

On test l'existence de la variable $mysql_user, si elle n'est pas présente ou vide on l'export avec notre parametre local et on precise l'argument a passer au client mysql.

    if ! test $mysql_user ;
    then
    	export mysql_user='root';
    fi;
    test_host="-u $mysql_user";

On test l'existence de la variable $mysql_pass, si elle n'est pas présente ou vide on l'export avec notre parametre local et on precise l'argument a passer au client mysql.

    if ! test $mysql_pass ;
    then
    	test_pass=''
    	export mysql_pass=''
    else
    	test_pass="-p $mysql_pass";
    fi;

On test l'existence de la variable $mysql_base, si elle n'est pas présente ou vide on l'export avec notre parametre local et on precise l'argument a passer au client mysql.

    if ! test $mysql_base ;
    then
    	export mysql_base='oclock';
    fi;
    test_base="-b $mysql_base";


On commence par positioner un compteur pour pouvoir intérrompre le lancement en cas d'échec d'accès au serveur mysql.

    x=1;

et on lance une requête pour lister les bases de données sur le serveur mysql renseigné.

    echo "show databases;"| mysql $test_user $test_host $test_pass > /dev/null 2>&1;

On test ensuite le retour de la commande pour boucler tant qu'elle n'est pas executée avec succès ( $? = 0 )

    while [ "$?" = "1" ] ;
    do

On affiche le nombre de tentatives d'accès au serveur.

    	echo "[$(date)] Tentative de connexion au serveur mysql n° $x";

Puis on incrémente le nombre de tentatives de un en faisant une pause d'une seconde avant de procéder a une nouvelle tentative.

    	x=`expr $x + 1`;
    	sleep 1;

Si le nombre de tentative est supérieur a 5, on coupe le lancement en affichant une erreur.

    	if [ $x -gt 5 ] ;
    	then
    		echo "[$(date)] Le serveur mysql ne semble pas répondre !!! "
    		exit 1;
    	fi;

Et on relance la requête pour lister les bases de données afin de rafraichir la variable $?

    	echo "show databases;"| mysql $test_user $test_host $test_pass > /dev/null 2>&1;
    done;

Si on est sortie de la boucle c'est que la requete a fonctionné, on peut donc fierement l'afficher.

    echo "[$(date)] Le serveur mysql semble démarré :)";

Si nous utilisons notre serveur mysql local et que les variables de creation de base ( $create_database ), de création de table ( $create_table ) ou d'insertion de données ( $insert_datas ) ne sont pas explicitement positionées a "no", nous procédons aux différentes créations / insertions. Ceci est particulierment utile si vous utlisez la persistence de données avec le montage d'un volume local vers /var/lib/mysql.


    if [ "$mysql_host" = "localhost" ];
    then
    	if [ ! "$create_database" = "no" ];
    	then
    		echo "create database $mysql_base;"| mysql $test_user $test_host $test_pass > /dev/null 2>&1;
    	fi;

    	if [ ! "$create_table" = "no" ];
    	then
    		cat setup/create.table.sql| mysql $test_user $test_host $test_pass $test_base > /dev/null 2>&1;
    	fi;

    	if [ ! "$insert_datas" = "no" ];
    	then
    		cat setup/insert.datas.sql| mysql $test_user $test_host $test_pass $test_base > /dev/null 2>&1;
    	fi;
    fi;

On finit par lancer php avec son servivce web interne pour servir sur le port 80.

	php -S 0.0.0.0:80 -t www/;


### Commandes docker  <a name="commandesPhpMysql"></a>

Récupération de l'image depuis les depots de docker hub

	docker pull jpcrevoisier/phpmysql:oclock

Récupération de l'image a partir de l'archive [phpmysql-oclock.gz](https://github.com/jpcrevoisier/memory/raw/main/docker/phpmysql/phpmysql-oclock.gz).

	docker load < phpmysql-oclock.gz

Création de l'image phpmysql:oclock ( renommez la comme ca vous chante :) )

	docker build . -t jpcrevoisier/phpmysql:oclock

Lancement de l'image

	docker run -p 80:80 -it --rm jpcrevoisier/phpmysql:oclock



