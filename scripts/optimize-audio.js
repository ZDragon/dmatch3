#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎵 Оптимизация аудио файлов...');

const audioDir = path.join(__dirname, '../assets/audio');
const audioFiles = ['background.wav', 'click.wav', 'match.wav'];

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkAudioFiles() {
  console.log('📁 Проверяем аудио файлы...');
  
  let totalSize = 0;
  
  audioFiles.forEach(file => {
    const filePath = path.join(audioDir, file);
    
    if (fs.existsSync(filePath)) {
      const size = getFileSize(filePath);
      totalSize += size;
      console.log(`✅ ${file}: ${formatBytes(size)}`);
      
      // Предупреждения о больших файлах
      if (size > 10 * 1024 * 1024) { // > 10MB
        console.log(`⚠️  Внимание: ${file} очень большой (${formatBytes(size)})`);
        console.log('   Рекомендуется оптимизировать качество аудио');
      }
    } else {
      console.log(`❌ ${file}: не найден`);
    }
  });
  
  console.log(`📊 Общий размер аудио: ${formatBytes(totalSize)}`);
  
  // Рекомендации по оптимизации
  if (totalSize > 25 * 1024 * 1024) { // > 25MB
    console.log('\n💡 Рекомендации по оптимизации:');
    console.log('   1. Снизьте качество аудио (например, с 44kHz до 22kHz)');
    console.log('   2. Используйте формат MP3 вместо WAV для фоновой музыки');
    console.log('   3. Рассмотрите возможность ленивой загрузки аудио');
    console.log('   4. Сократите длительность фоновой музыки');
  }
  
  return totalSize;
}

function createAudioManifest() {
  console.log('📝 Создаем манифест аудио файлов...');
  
  const manifest = {
    audio: {},
    totalSize: 0,
    generated: new Date().toISOString()
  };
  
  audioFiles.forEach(file => {
    const filePath = path.join(audioDir, file);
    
    if (fs.existsSync(filePath)) {
      const size = getFileSize(filePath);
      manifest.audio[file] = {
        size: size,
        sizeFormatted: formatBytes(size),
        path: `assets/audio/${file}`
      };
      manifest.totalSize += size;
    }
  });
  
  manifest.totalSizeFormatted = formatBytes(manifest.totalSize);
  
  const manifestPath = path.join(__dirname, '../dist/audio-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`✅ Манифест создан: ${manifestPath}`);
  return manifest;
}

// Основная функция
function optimizeAudio() {
  try {
    // Проверяем существование папки аудио
    if (!fs.existsSync(audioDir)) {
      console.error('❌ Папка assets/audio не найдена');
      process.exit(1);
    }
    
    // Проверяем аудио файлы
    const totalSize = checkAudioFiles();
    
    // Создаем манифест (если папка dist существует)
    const distPath = path.join(__dirname, '../dist');
    if (fs.existsSync(distPath)) {
      createAudioManifest();
    }
    
    console.log('✅ Оптимизация аудио завершена');
    
    // Возвращаем информацию для использования в других скриптах
    return {
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      files: audioFiles.length
    };
    
  } catch (error) {
    console.error('❌ Ошибка при оптимизации аудио:', error.message);
    process.exit(1);
  }
}

// Запускаем, если скрипт вызван напрямую
if (require.main === module) {
  optimizeAudio();
}

module.exports = { optimizeAudio, formatBytes }; 