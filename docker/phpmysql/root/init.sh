#!/bin/ash
if ! test $mysql_host ;
then
	export mysql_host='localhost';
fi;
test_host="-h $mysql_host";
if [ "$mysql_host" = "localhost" ];
then
	/usr/bin/mysqld --user=root > /memory/log/mysqld.start.log 2>&1 &
fi;

if ! test $mysql_user ;
then
	export mysql_user='root';
fi; 
test_host="-u $mysql_user";

if ! test $mysql_pass ;
then
	test_pass=''
	export mysql_pass=''
else
	test_pass="-p $mysql_pass";
fi;

if ! test $mysql_base ;
then
	export mysql_base='oclock';
fi; 
test_base="-b $mysql_base";

x=1;
echo "show databases;"| mysql $test_user $test_host $test_pass > /dev/null 2>&1;
while [ "$?" = "1" ] ;
do
	echo "[$(date)] Tentative de connexion au serveur mysql n° $x";
	x=`expr $x + 1`;
	sleep 1;
	if [ $x -gt 5 ] ;
	then
		echo "[$(date)] Le serveur mysql ne semble pas répondre !!! "
		exit 1;
	fi;
	echo "show databases;"| mysql $test_user $test_host $test_pass > /dev/null 2>&1;
done;
echo "[$(date)] Le serveur mysql semble démarré :)";

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

php -S 0.0.0.0:80 -t www/;
