/*
 * grunt-release-branch
 *
 * Copyright (c) 2013 Christoph Burgdorf, contributors
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    var fs              = require("fs"),
        exec            = require('child_process').exec,
        defaultOptions  = {
            releaseBranch: 'gh-pages',
            remoteRepository: 'origin',
            distDir: 'dist',
            commitMessage: 'RELEASE',
            commit: true,
            push: false,
            blacklist: [
                '.git'
            ]
        };

    grunt.registerMultiTask('releaseBranchPre','release dist as branch', function(){

        var options = this.options(defaultOptions);

        var done = this.async();

        var releaseBranch = options.releaseBranch;
        exec('git branch -D ' +  releaseBranch + '; git checkout -b ' + releaseBranch, options.execOptions, function(){
            done();
        });

        grunt.log.writeln('running release branch pre task...');
    });

    grunt.registerMultiTask('releaseBranch','release dist as branch', function(){

        var options = this.options(defaultOptions);

        options.blacklist.push(options.distDir);
        var blacklist = options.blacklist;

        var rmdirRec = function(path) {
            var files = [];
            if( fs.existsSync(path) ) {
                files = fs.readdirSync(path);
                files.forEach(function(file,index){
                    var curPath = path + "/" + file;
                    if(fs.statSync(curPath).isDirectory()) { // recurse
                        rmdirRec(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(path);
            }
        };

        var done = this.async();

        fs.readdir('.', function(err, contents){
            
            contents.forEach(function(name, index){
                if (blacklist.indexOf(name) === -1){
                    var stats = fs.lstatSync(name);

                    if (!err && stats.isDirectory()) {
                        grunt.log.writeln('delete directory: ' + name);
                        rmdirRec(name);
                    }
                    else{
                        grunt.log.writeln('delete file: ' + name);
                        fs.unlinkSync(name);
                    }
                }
            });
            grunt.log.writeln('now moving files from ' + options.distDir + ' to root level');
            //move all files from the dist dir to the root level
            exec('mv ' + options.distDir + '/* .', function(){

                //now that everything has been moved. Delete the dist dir
                rmdirRec(options.distDir);
                
                if (options.commit){

                    grunt.log.writeln('commiting files as: ' + options.commitMessage);
                    
                    exec('git add -A && git commit -m "' + options.commitMessage + '"', function(){
                        
                        if (options.push){
                            
                            grunt.log.writeln('pushing commit to: ' + options.releaseBranch);
                            exec('git push -f ' + options.remoteRepository + ' ' + options.releaseBranch, function(){
                                done();
                            });
                        }
                        else{
                            done();
                        }
                    });
                }
                else{
                    done();
                }
            });
        });

        grunt.log.writeln('running release branch task...');
    });
};