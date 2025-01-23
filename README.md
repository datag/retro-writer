# RetroWriter

<img src="public/logo.svg" width="250" alt="Logo">

## Hosted App

[Try It Out](https://datag.github.io/retro-writer/)

## RetroWriter Help


### Keys

| Key/Command               | Action                                                                 |
|---------------------------|-----------------------------------------------------------------------|
| `F2`                     | Select foreground (SHIFT clears)                                      |
| `F3`                     | Select background (SHIFT clears)                                      |
| `F4`                     | Select border (SHIFT clears)                                          |
| `F6`                     | Enable pulsating (SHIFT disables)                                     |
| `F7`                     | Select scope cursor (SHIFT selects global)                           |
| `F9`                     | Enable auto advance (SHIFT disables)                                 |
| `F10`                    | Playback                                                              |
| `CTRL + 0-9`             | Select color from palette                                             |
| `Cursor`                 | Move around                                                          |
| `<character>`            | Writes character (and advances, if auto advance is enabled)          |
| `Delete`                 | Clear cell under cursor                                               |
| `Backspace`              | Retract cursor and clear cell under cursor                            |
| `PageDown`               | Scroll without moving cursor                                          |
| `Pause/Space`            | Pause/Continue                                                       |
| `CTRL + P / Print`       | Download screenshot                                                  |
| `CTRL + S`               | Download demo                                                        |
| `CTRL + O`               | Open demo (also via Drag & Drop)                                      |
| `SHIFT + F5`             | Reset                                                                |

### Hash URLs

* `#play:<url>`: Plays demo loaded from external URL (CORS headers required)


## Dev setup

Assuming we're using [pnpm](https://pnpm.io/).

```shell
pnpm install
pnpm dev
```

And then browse to http://localhost:5173/.
