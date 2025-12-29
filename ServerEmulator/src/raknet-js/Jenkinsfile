pipeline {
   agent any

   tools {nodejs "NodeJS"}

   stages {
       stage('Downloading Dependencies') {
           steps {
               sh 'npm install'
           }
       }
       stage('Tests and Coverage') {
           steps {
               sh 'npm test'
           }
       }
   }
}