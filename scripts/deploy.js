#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { optimizeAudio } = require('./optimize-audio');

console.log('🚀 Начинаем процесс развертывания...');

// Проверяем, что мы в правильной директории
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json не найден. Убедитесь, что вы в корневой папке проекта.');
  process.exit(1);
}

try {
  // Очищаем предыдущую сборку
  console.log('🧹 Очищаем предыдущую сборку...');
  execSync('npm run clean', { stdio: 'inherit' });

  // Устанавливаем зависимости
  console.log('📦 Устанавливаем зависимости...');
  execSync('npm install', { stdio: 'inherit' });

  // Оптимизируем аудио файлы
  console.log('🎵 Оптимизируем аудио файлы...');
  const audioInfo = optimizeAudio();

  // Собираем проект
  console.log('🔨 Собираем проект для продакшн...');
  execSync('npm run build', { stdio: 'inherit' });

  // Проверяем, что сборка создалась
  if (!fs.existsSync('dist')) {
    console.error('❌ Папка dist не создана. Проверьте ошибки сборки.');
    process.exit(1);
  }

  // Показываем размер сборки
  const distSize = getDirectorySize('dist');
  console.log(`📊 Размер сборки: ${formatBytes(distSize)}`);
  console.log(`🎵 Размер аудио: ${audioInfo.totalSizeFormatted} (${audioInfo.files} файлов)`);

  // Показываем содержимое dist
  console.log('📁 Содержимое папки dist:');
  showDirectoryContents('dist');

  console.log('✅ Развертывание завершено успешно!');
  console.log('📋 Следующие шаги:');
  console.log('   1. Скопируйте содержимое папки dist/ на ваш веб-сервер');
  console.log('   2. Убедитесь, что сервер поддерживает gzip и brotli сжатие');
  console.log('   3. Настройте кэширование для статических файлов');
  console.log('   4. Проверьте загрузку аудио файлов в браузере');

} catch (error) {
  console.error('❌ Ошибка при развертывании:', error.message);
  process.exit(1);
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        calculateSize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  }
  
  calculateSize(dirPath);
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showDirectoryContents(dirPath, indent = '') {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      console.log(`${indent}📁 ${item}/`);
      showDirectoryContents(itemPath, indent + '  ');
    } else {
      const size = formatBytes(stats.size);
      console.log(`${indent}📄 ${item} (${size})`);
    }
  }
} 