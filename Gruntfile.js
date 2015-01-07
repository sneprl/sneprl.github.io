module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        vesrion: grunt.file.readJSON('package.json').version,
        uglify: {
            my_target: {
                files: {
                    'js/InfiniteCarousel-<%=vesrion%>/minified/InfiniteCarousel.min.js': ['js/InfiniteCarousel-dev/InfiniteCarousel.js']
                }
            }
        },
        copy: {
            main: {
                files: [
                    //FULL DEV VERSION
                    {
                        expand: true,
                        cwd:'js/InfiniteCarousel-dev/img/',
                        src:['**'],
                        dest: 'js/InfiniteCarousel-<%=vesrion%>/dev/img/'
                    },
                    {
                        expand: true,
                        cwd:'js/InfiniteCarousel-dev/',
                        src:[
                            'InfiniteCarousel.js',
                            'InfiniteCarousel.css',
                            'jquery.hammer.js'
                        ],
                        dest: 'js/InfiniteCarousel-<%=vesrion%>/dev/'
                    },
                    //MINIFIED VERSION
                    {
                        expand: true,
                        cwd:'js/InfiniteCarousel-dev/img/',
                        src:['**'],
                        dest: 'js/InfiniteCarousel-<%=vesrion%>/minified/img/'
                    },
                    {
                        expand: true,
                        cwd:'js/InfiniteCarousel-dev/',
                        src:[
                            //'InfiniteCarousel.css',
                            'jquery.hammer.js'
                        ],
                        dest: 'js/InfiniteCarousel-<%=vesrion%>/minified/'
                    }
                ]
            }
        },
        cssmin: {
            compress: {
                files: {
                    'js/InfiniteCarousel-<%=vesrion%>/minified/InfiniteCarousel.min.css': ['js/InfiniteCarousel-dev/InfiniteCarousel.css']
                }
            }
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // task(s).
    grunt.registerTask('build', ['uglify', 'cssmin', 'copy']);
};