#!/usr/bin/env bash
# render-build.sh — ensures OpenJDK 17 is downloaded and builds the Spring Boot app

set -e

if ! command -v java &> /dev/null && [ ! -d ".jdk" ]; then
    echo "☕ Java not found — downloading OpenJDK 17 for Linux..."
    mkdir -p .jdk
    curl -sL "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.12_7.tar.gz" | tar -xz -C .jdk --strip-components=1
fi

if [ -d ".jdk" ]; then
    export JAVA_HOME="$(pwd)/.jdk"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "☕ Java version:"
java -version

echo "🔨 Building Spring Boot application with Gradle..."
chmod +x gradlew
./gradlew build -x test --no-daemon
