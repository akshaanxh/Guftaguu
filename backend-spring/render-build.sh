#!/usr/bin/env bash
# render-build.sh — ensures OpenJDK 17 and Gradle 8.14 are downloaded and builds the Spring Boot app

set -e

# 1. Download OpenJDK 17 if not installed
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

# 2. Download Gradle 8.14 binary directly (bypassing gradle-wrapper.jar)
if ! command -v gradle &> /dev/null && [ ! -d ".gradle_bin" ]; then
    echo "📦 Downloading Gradle 8.14 binary..."
    mkdir -p .gradle_bin
    curl -sL "https://services.gradle.org/distributions/gradle-8.14-bin.zip" -o gradle.zip
    unzip -q gradle.zip
    mv gradle-8.14/* .gradle_bin/
    rm -rf gradle.zip gradle-8.14
fi

if [ -d ".gradle_bin" ]; then
    export PATH="$(pwd)/.gradle_bin/bin:$PATH"
fi

echo "📦 Gradle version:"
gradle --version

echo "🔨 Building Spring Boot application..."
gradle build -x test --no-daemon
