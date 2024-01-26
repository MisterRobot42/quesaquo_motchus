// ==UserScript==
// @name         qu'es aquò (Motchus)
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Donne la définition du mot du jour Motchus
// @author       MisterRobot42
// @match        https://motchus.fr/*
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    let motTrouve = false;
    let rechercheEffectuee = false;
    let definitions = await fetchDefinitions();

// Crée une bulle flottante sur la page pour afficher du texte.
    function createBox(text) {
        var box = document.createElement('div');
        box.id = 'customBox';
        box.style.cssText = 'position: fixed; top: 10px; right: 10px; background-color: #ffffff; border: 1px solid #cccccc; padding: 10px; width: 500px; height: auto; text-align: justify; font-size: 16px; color: #000000;';
        box.innerHTML = text + ' <button id="closeBox" style="float: right; cursor: pointer;">X</button>';
        document.body.appendChild(box);
        document.getElementById('closeBox').addEventListener('click', function() {
            document.getElementById('customBox').remove();
        });
    }

// Récupère le contenu du fichier JS contenant les définitions des mots.
    async function fetchDefinitions() {
        try {
            const response = await fetch('https://motchus.fr/js/mots/definitionMotsATrouver.js');
            const responseText = await response.text();
            return extractDefinitions(responseText);
        } catch (error) {
            console.error('Erreur lors de la récupération des définitions :', error);
        }
    }

// Extrait les définitions des mots à l'aide d'une expression régulière et les stocke dans un objet.
    function extractDefinitions(text) {
        const regex = /'([^']+) : ([^']+)'/g;
        let match;
        let definitions = {};

        while ((match = regex.exec(text)) !== null) {
            definitions[match[1]] = match[2];
        }
        return definitions;
    }

// Fonction pour normaliser les chaînes de caractères (retirer les accents)
    function normaliserChaine(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    }

// Cherche une définition qui commence par un mot spécifié et affiche cette définition dans une bulle flottante.
  function findAndDisplayDefinitionStartingWith(definitions, startWith) {
        let motNormalise = normaliserChaine(startWith);
        for (let key in definitions) {
            let pattern = /^["']?([À-ÿa-zA-Z'’-]+(?:\s[À-ÿa-zA-Z'’-]+)*)(?:\sou\s[À-ÿa-zA-Z'’-]+)*/;
            let match = key.match(pattern);
            if (match && normaliserChaine(match[1]) === motNormalise) {
                motTrouve = true;
                createBox(`'${key} : ${definitions[key]}'`);
                return;
            }
        }

       // On ratisse plus large
        for (let key in definitions) {
            if (normaliserChaine(key).includes(motNormalise)) {
                motTrouve = true;
                createBox(`'${key} : ${definitions[key]}'`);
                return;
            }
        }

        // Recherche du mot au singulier dans le cas des pluriels
        if (!motTrouve && motNormalise.endsWith('S')) {
            findAndDisplayDefinitionStartingWith(definitions, motNormalise.slice(0, -1));
        }

        if (!motTrouve) {
            console.log("Définition non trouvé pour le mot " + startWith);
        }
    }


    // TODO : utiliser la recherche Google si le mot n'est pas trouvé dans les définitions
    function rechercherMot(mot) {
        if (!rechercheEffectuee && mot) {
            window.open(`https://www.google.com/search?q=${mot}`, '_blank');
            rechercheEffectuee = true;
        }
    }

    // Surveille les changements sur la page pour détecter une victoire ou une défaite.
    //  - En cas de victoire, le script parcourt la grille pour trouver le mot gagnant et affiche sa définition.
    //  - En cas de défaite, il affiche la définition du mot donné.
    let observer = new MutationObserver(mutations => {
        if (!rechercheEffectuee) {
            let defaitePanel = document.getElementById('defaite-panel-mot');
            let victoirePanel = document.getElementById('victoire-panel');

            if (defaitePanel && defaitePanel.textContent && !motTrouve) {
                findAndDisplayDefinitionStartingWith(definitions, defaitePanel.textContent.trim());
                observer.disconnect(); // Arrêtez l'observation ici
            } else if (victoirePanel && victoirePanel.offsetParent && !motTrouve) {
                let lignes = document.querySelectorAll('#grille table tr');
                for (let ligne of lignes) {
                    let lettres = ligne.querySelectorAll('td.resultat.bien-place');
                    if (lettres.length === ligne.querySelectorAll('td.resultat').length) {
                        let motGagnant = Array.from(lettres).map(td => td.textContent).join('');
                        findAndDisplayDefinitionStartingWith(definitions, motGagnant);
                        observer.disconnect();
                        break;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
