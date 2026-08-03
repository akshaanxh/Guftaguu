#!/usr/bin/env bash
# render-start.sh — launches the Spring Boot JAR using downloaded or system Java

set -e

if [ -d ".jdk" ]; then
    export JAVA_HOME="$(pwd)/.jdk"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

JAR=$(ls build/libs/*.jar | grep -v "plain" | head -n 1)

echo "🚀 Starting Guftaguu Spring Boot Backend: $JAR"
exec java -jar "$JAR"
