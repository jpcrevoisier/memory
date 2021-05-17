CREATE TABLE `memory` (
 `id` int(10) unsigned NOT NULL auto_increment,
 `pseudo` varchar(64) collate utf8_unicode_ci NOT NULL,
 `score` int(5) unsigned NOT NULL,
 `grid` varchar(85) collate utf8_unicode_ci NOT NULL,
 `created` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
 PRIMARY KEY  (`id`),
 UNIQUE KEY `pseudo` (`pseudo`,`score`,`grid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
