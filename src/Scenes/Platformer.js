class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 2000;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.lastWaterParticleTime = 0;
        this.particleInterval = 250; // milliseconds
    }

    create() {
        this.score = 0;

        this.sfx = {
        coin: this.sound.add('coin',{ volume: 0.4 }),
        jump: this.sound.add('jump', { volume: 0.2 }),
        key: this.sound.add('key'),
        chest: this.sound.add('chest'),
        bgm: this.sound.add('bgm', { loop: true, volume: 0.5 })  // background music
        };

    // Play background music
        this.sfx.bgm.play();
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset1 = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");
        this.tileset2 = this.map.addTilesetImage("foodpack", "foodpack");

        // Create layer with multiple tilesets (if your layer uses both)
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", [this.tileset1, this.tileset2], 0, 0);


        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });
        this.dangerousTiles = this.groundLayer.filterTiles(tile => tile.properties.dangerous);
        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);
        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.keys = this.map.createFromObjects("Objects", {
            name: "key",
            key: "tilemap_sheet",
            frame: 27
        });

        this.chest = this.map.createFromObjects("Objects", {
            name: "chest",
            key: "tilemap_sheet",
            frame: 28
        });

        // Extract single objects from arrays
        this.chest = this.chest[0];
        this.key = this.keys[0];
        this.hasKey = false;
        // Enable physics on the actual objects you're using
        if (this.coins && this.coins.length > 0) {
            this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
            console.log("✓ Coins physics enabled");
        } else {
            console.log("✗ No coins found - check object name and placement");
        }

        if (this.key) {
            this.physics.world.enable(this.key, Phaser.Physics.Arcade.STATIC_BODY);
            console.log("✓ Key physics enabled");
        }
        if (this.chest) {
            this.physics.world.enable(this.chest, Phaser.Physics.Arcade.STATIC_BODY);
            console.log("✓ Chest physics enabled");
        }
        // Use the single key object directly instead of a group
        if (this.key) {
            this.physics.add.overlap(my.sprite.player, this.key, (player, key) => {
                key.destroy();
                this.hasKey = true;
                this.sfx.key.play();
            }, null, this);
        }

        // Only add chest collision if chest exists
        if (this.chest) {
            this.physics.add.overlap(my.sprite.player, this.chest, (player, chest) => {
                if (this.hasKey) {
                    chest.destroy();
                    this.sfx.chest.play();
                    this.score += 1000;
                    this.scoreText.setText('Score: ' + this.score);
                } else {
                    console.log("Chest is locked! Find the key.");
                }
            }, null, this);
        }
        this.flagTile = this.map.findTile(tile => tile.properties.isflag, this, 0, 0, this.map.width, this.map.height, true);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);
        // Find water tiles
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water == true;
        });
        this.waterPositions = this.waterTiles.map(tile => {
            return {
                x: tile.getCenterX(),
                y: tile.getCenterY()
            };
        });
        
        
        // Try the simplest possible particle setup first
        this.waterParticles = this.add.particles(0, 0, 'kenny-particles', {
            frame: 'smoke_01.png',
            lifespan: 2000,
            speedY: { min: -60, max: -30 },
            speedX: { min: -10, max: 10 }, // Add some horizontal movement
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.7, end: 0 },
            blendMode: 'ADD',
            emitting: false, // Important: disable auto-emission
            quantity: 1      // Emit one particle at a time
        });




        // create coin collect particle effect here
        // Important: make sure it's not running
        this.coinEmitter = this.add.particles(0, 0, 'kenny-particles', {
            frame: 'star_07.png',
            lifespan: 500,
            speed: { min: 50, max: 150 },
            scale: { start: 0.3, end: 0 },
            quantity: 5,
            emitting: false // disables auto start
        });

        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            this.coinEmitter.emitParticleAt(obj2.x, obj2.y, 5);
            this.sfx.coin.play();
            this.score += 10;
            console.log("Score updated: " + this.score); // Debug log
            if (this.scoreText) {
                this.scoreText.setText('Score: ' + this.score);
                console.log("Score text updated"); // Debug log
            } else {
                console.log("Score text object is missing!"); // Debug log
            }


        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
        frame: ['dirt_01.png', 'dirt_02.png'],
        // TODO: Try: add random: true
        scale: {start: 0.03, end: 0.1},
        maxAliveParticles: 8,
        lifespan: 350,
        gravityY: -200,
        alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();

        my.vfx.jump = this.add.particles(0, 0, "kenny-particles", {
            frame: ['dirt_03.png', 'dirt_04.png'],
            scale: { start: 0.04, end: 0.15 },
            lifespan: 350,
            gravityY: -200,
            alpha: { start: 1, end: 0 },
            speedY: { min: -50, max: -150 },
            quantity: 8,
        });
        my.vfx.jump.stop(); 



        // Simple camera to follow player
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); 
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
        this.cameras.main.setBackgroundColor('#87CEEB');



this.scoreText = this.add.text(420, 250, 'Score: 0', {
    fontSize: '24px',  
    fill: '#ff0000',   
    fontFamily: 'Arial'
});
this.scoreText.setScrollFactor(0);
this.scoreText.setDepth(10000);
this.scoreText.setOrigin(0.5, 0.5); 


console.log("Score text created:", this.scoreText);
console.log("Score text position:", this.scoreText.x, this.scoreText.y);
console.log("Score text visible:", this.scoreText.visible);
console.log("Camera zoom:", this.cameras.main.zoom);
console.log("Camera bounds:", this.cameras.main.width, this.cameras.main.height);
    }

    update(time,delta) {
        if (time > this.lastWaterParticleTime + this.particleInterval) {
            let pos = Phaser.Utils.Array.GetRandom(this.waterPositions);
            this.waterParticles.emitParticleAt(pos.x, pos.y, 1);
            this.lastWaterParticleTime = time;
        }
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }
        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();

        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.sfx.jump.play();
            my.vfx.jump.emitParticleAt(my.sprite.player.x, my.sprite.player.y + my.sprite.player.displayHeight / 2);

        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.sfx.bgm.stop();
            this.scene.restart();
        }
        let tileUnderPlayer = this.groundLayer.getTileAtWorldXY(
            my.sprite.player.x,
            my.sprite.player.y + my.sprite.player.height / 2,
            true
        );
        if (this.flagTile) {
                const playerTileX = this.map.worldToTileX(my.sprite.player.x);
                const playerTileY = this.map.worldToTileY(my.sprite.player.y);

                if (playerTileX === this.flagTile.x && playerTileY === this.flagTile.y) {
                    this.endGame();
                }
            }
        

        // If the tile exists and is dangerous, restart the scene
        if (tileUnderPlayer && tileUnderPlayer.properties.dangerous) {
            this.sfx.bgm.stop();
            this.scene.restart();
        }
    }

endGame() {
    console.log("End game triggered!");
    this.physics.pause(); // stop movement

    const cam = this.cameras.main;

    // Decide the win message based on score
    let winMessage = 'You Win!';
    if (this.score > 1200) {
        winMessage = 'Special Winner!';
    }

    // Main "You Win!" or "Special Winner!" text
    const winText = this.add.text(cam.width / 2, cam.height / 2 - 20, winMessage, {
        fontSize: '48px',
        fill: '#ffff00',
    });
    winText.setOrigin(0.5);
    winText.setScrollFactor(0);
    winText.setDepth(1000);

    // Instruction text below
    const restartText = this.add.text(cam.width / 2, cam.height / 2 + 30, 'Press R to Restart (collect chest for special win)', {
        fontSize: '24px',
        fill: '#ffffff',
    });
    restartText.setOrigin(0.5);
    restartText.setScrollFactor(0);
    restartText.setDepth(1000);
}
}