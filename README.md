# Match-3 Engine

## Overview
This project is a basic implementation of a Match-3 game engine built using PhaserJS. The engine is designed to be deterministic, allowing for reproducible game sessions based on a fixed seed and user actions. It includes core game mechanics, a replay system, and a minimal user interface.

## Features
- **Deterministic Gameplay**: Uses a fixed seed for random number generation to ensure consistent game behavior.
- **Match-3 Mechanics**: Implements core functionalities such as match detection, element removal, gravity application, and spawning new elements.
- **Replay System**: Records user actions and game events for playback, enabling users to replay their sessions.
- **Basic UI**: Includes buttons for starting the game and replaying previous sessions.

## Project Structure
```
match3-engine/
├── src/
│   ├── core/
│   │   ├── game-logic.js      // Core game logic for match detection and gravity
│   │   ├── deterministic.js     // Random number generation with seed
│   │   └── replay-system.js     // Recording and playback of user actions
│   ├── scenes/
│   │   └── main-scene.js       // Main game scene rendering and input handling
│   ├── utils/
│   │   └── logger.js           // Logging utility for debugging
│   └── index.js                // Game initialization
├── assets/                     // Directory for sprite assets
├── tests/
│   └── game-logic.test.js      // Automated tests for game logic
└── README.md                   // Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd match3-engine
   ```
3. Install the required dependencies:
   ```
   npm install
   ```
4. Start the game:
   ```
   npm start
   ```

## Testing
To run the automated tests, use the following command:
```
npm test
```

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.