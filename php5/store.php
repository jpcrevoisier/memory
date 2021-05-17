<?php
/*
* On créer une class memoryStorage dont le but est de gérer l'enregistrement et le renvoie des scores
* avec la possibilité de fournir un retour au format json même en cas d'erreur quand c'est possible.
*/


class memoryStorage
{	// déclaration des propriétés de l'objet avec trois types visibilités
	// public pour une propriété qui peut être lu et ecrite depuis l'exterieur
	// protected pour une propriété qui ne sera ni lisible, ni ecrasable, mais redéclarable par une class qui hérite de cette même class
	// private pour une propriété qui ne sera ni lisible, ni ecrasable, ni redéclarable dans une class qui hérite de cette même class
	protected $rawDatas=null;
	protected $postdata=null;
	public $nicely=false;
	private $mysqli=null;
	private $hostanme=null;
	private $username=null;
	private $password=null;
	private $database=null;

    function __construct()
    {

		// On pose ici un gestionnaire d'erreurs qui va permetre de renvoyer les erreurs pour être formatées en json par notre fonction 'sendFeedBack' et donc interprétable par notre client web.
		set_error_handler(function($errNo, $errMsg, $file, $line)
		{
			$this->sendFeedBack(array('succes'=>false,'message'=>"Une erreur est survenue avec le message '$errMsg', n°$errNo  a la ligne $line du fichier '$file'", 'datas'=>[$errNo, $errMsg, $file, $line]), '500 Internal Server Error');
		});
		
		// On initialise la connexion au serveur mysql car que ce soit en lecture ou en écritue nous en aurons forcément besoin ...
		$this->mysqliConnect();
		
		if($_SERVER['REQUEST_METHOD']==='GET')
		{	// On passe en mode renvoie des données du hall of fames
			// Vous noterez l'originalité des noms de mes méthodes
			$this->selectDatas();
		}        
		elseif($_SERVER['REQUEST_METHOD']==='POST')
        {	// on switch vers l'insertion de données 
			$this->insertDatas();
		}
		// Si aucune des deux méthodes supportées n'est utilisée alors on renvois un message d'erreur.
		$this->sendFeedBack(array('succes'=>false,'message'=>'les seules méthodes supportées sont POST et GET !','datas'=>'REQUEST METHOD : '.$_SERVER['REQUEST_METHOD']), '405 Method Not Allowed');
	}
	function sendFeedBack($feedback, $header=null)
	{
		// On test que les informations recues par la méthode sont aux formats json et exploitables 
		switch(gettype($feedback))
		{
			case 'boolean' :
			case 'integer' :
			case 'double' :
			case 'string' :
			case 'NULL' :
				$oldFeedback=$feedback;
				$header='500 Internal Server Error';
				$feedback=array('succes'=>false,'message'=>'les données renvoyées ne sont pas au format attendue !','datas'=>$oldFeedback);
			case 'resource' :
			case 'resource (closed)' :
			case 'unknown type' :
				$oldFeedback=$feedback;
				$header='500 Internal Server Error';
				$feedback=array('succes'=>false,'message'=>'les données renvoyées ne sont pas au format attendue !','datas'=>gettype($oldFeedback));
		}

		// Pour tester la présence d'un header nous allons voir une autre façon de coder une condition if.
		// le principe est de mettre la condition a tester entre parentheses et suivie du'un point d'intérrogation et de l'execution si la condition est vérifiée.
		// Si on doit préciser du code en cas de condition non satisfaite on le fait en ajoutant deux points et le code a éxecuter
		// ( condition a tester ) ? éxecution si la condition est satisfaite : éxecution si la condition n'est pas satisfaite ;
		// Notez que puisque php renvoi automatiquement un 200 OK si rien n'est précisé
		// nous aurions pu ne faire qu'un ($header)?header('HTTP/1.0 '.$header);

		( $header ) ? header('HTTP/1.0 '.$header) : header('HTTP/1.0 200 OK') ;
		header('Content-Type: application/json');
		echo(json_encode($feedback));
		exit();
	}
	function mysqliConnect()
	{
		// Ici nous allons tester l'existence de variables d'environement contenant les informations de connection au serveur mysql
		// Ce n'est pas une méthode très conventionelle mais elle permet de ne pas stocker ces informations dans un fichier
		// et de les transmettre via la ligne de commande dans le cadre de l'utilisation d'une image Docker

		if(
			isset($_ENV['mysql_host'])
		&&
			isset($_ENV['mysql_user'])
		&&
			isset($_ENV['mysql_pass'])
		&&
			isset($_ENV['mysql_base'])
		)
		{
			$this->hostname=$_ENV['mysql_host'];
			$this->username=$_ENV['mysql_user'];
			$this->password=$_ENV['mysql_pass'];
			$this->database=$_ENV['mysql_base'];	
		}
		// Si une de ces variables n'est pas renseignées, nous nous retournons vers la lecture d'un fichier de configuration plus traditionel
		elseif($mysqliConfig=require_once('mysqli.inc.php'))
		{
			$mysqliConfig=require_once('mysqli.inc.php');
			$this->hostname=$mysqliConfig['hostname'];
			$this->username=$mysqliConfig['username'];
			$this->password=$mysqliConfig['password'];
			$this->database=$mysqliConfig['database'];
		}
		// Si la récupération de cette configuration n'est pas non plus possible, on renvoit une erreur.
		else
		{
			$this->sendFeedBack(array('succes'=>false,'message'=>'Impossible de déterminer le paramétrage de connexion MySQL !','datas'=>null), '500 Internal Server Error');
		}
		// On lance la connexion mysql et on test l'objet pour nous assurer qu'il est bien instancié.
        $this->mysqli = new mysqli($this->hostanme, $this->username, $this->password, $this->database);
		if ($this->mysqli->connect_errno) {
			$this->sendFeedBack(array('succes'=>false,'message'=>'Echec lors de la connexion à MySQL : ('.$this->mysqli->connect_errno.') '.$this->mysqli->connect_error,'datas'=>null), '500 Internal Server Error');
		}
		return true;
	}
	function selectDatas()
	{
		// C'est la méthode de renvoi des scores
		// On forge la requete pour récupérer les 25 premiers enregistrements classé par score.
		$query="select `pseudo`, `score`, `grid` from `memory` order by `score` desc limit 25;";
		// On exécute la requête et on renvoi une erreur en cas de problème.
		if (!$res = $this->mysqli->query($query))
		{
			$this->sendFeedBack(array('succes'=>false,'message'=>'Echec lors de la récupération des données : ('.$this->mysqli->errno.') '.$this->mysqli->error,'datas'=>null), '500 Internal Server Error');
		}
		// On instancie un tableau vide dans lequel vont être stocké les resultats.
		$datas=array();
		$x=0;
		while ($row = $res->fetch_assoc()) {
			$datas[$x]['pseudo']=$row['pseudo'];
			$datas[$x]['score']=intval($row['score']);
			$datas[$x]['grid']=$row['grid'];
			$x++;
		}
		$this->sendFeedBack(array('succes'=>true,'message'=>'Récupération des données réalisé avec succès','datas'=>$datas));
	}
	function insertDatas()
	{
		// Méthode d'insertion des données.
		// On récupère les données sur l'entrée standard ( on aurait pu utiliser php://stdin )
		$this->rawDatas=file_get_contents('php://input');
		// Si il n'y a pas de donnée on renvoi une erreur.
		if(empty($this->rawDatas))
		{
			$this->sendFeedBack(array('succes'=>false,'message'=>'Aucune donnée recue !','datas'=>null), '415 Unsupported Media Type');
		}
		// Si les données ne sont pas exploitable en json on envoi aussi une erreur.
		if(!$this->postdata=json_decode($this->rawDatas, true))
		{
			$this->sendFeedBack(array('succes'=>false,'message'=>'les données envoyées ne sont pas au format json !','datas'=>$this->rawDatas), '415 Unsupported Media Type');
		}
		// Si les données sont exploiatbles en json, on teste que les données ne soient pas vides et qu'elles soient du bon type.
		if(
			empty($this->postdata['pseudo'])
		||
			!is_string($this->postdata['pseudo'])
		||
			empty($this->postdata['score'])
		||
			!is_integer($this->postdata['score'])
		||
			empty($this->postdata['grid'])
		||
			!is_array($this->postdata['grid'])
		)
		{
			$this->sendFeedBack(array('succes'=>false,'message'=>'les données envoyées ne sont pas au format attendue !','datas'=>$this->postdata), '415 Unsupported Media Type');
		}
		// On peut donc forger la requete d'insertion en prenant garde d'échaper les données avant l'insertion ( mysqli->real_escape_string )
		$query="insert into
				`memory`
			(
				`pseudo`,
				`score`,
				`grid`
			)
			values
			(
				'".$this->mysqli->real_escape_string($this->postdata['pseudo'])."',
				".$this->mysqli->real_escape_string($this->postdata['score']).",
				'".$this->mysqli->real_escape_string(implode(',',$this->postdata['grid']))."'
			);";
		// On lance l'insertion en base en testant le retour pour renvoyer une erreur en cas de probleme.
		if (!$res = $this->mysqli->query($query))
		{
			$this->sendFeedBack(array('succes'=>false,'message'=>'Echec lors de l\'insertion des données en base : ('.$this->mysqli->errno.') '.$this->mysqli->error,'datas'=>null), '500 Internal Server Error');
		}
		else
		{
			// Si tout s'est bien passé, on peut selectionner le dernier enregistrement avec mysqli->insert_id
			$query="select `pseudo`, `score`, `grid`, `created` from `memory` where `id`=".$this->mysqli->insert_id.";";
			if (!$res = $this->mysqli->query($query))
			{
				$this->sendFeedBack(array('succes'=>false,'message'=>'Echec lors de la récupération des données après l\'insertion des données : ('.$this->mysqli->errno.') '.$this->mysqli->error,'datas'=>null), '500 Internal Server Error');
			}
			$row=$res->fetch_assoc();
			$this->sendFeedBack(array('succes'=>true,'message'=>'Insertion reéalisé avec succès','datas'=>$row));
		}
	}
}

$memoryStorage = new memoryStorage;
