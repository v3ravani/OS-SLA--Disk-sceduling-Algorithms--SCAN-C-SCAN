# Disk Scheduling Algorithms Simulator

Interactive simulator and comparison tool for 5 disk scheduling algorithms:
- **FCFS** (First-Come, First-Served)
- **SSTF** (Shortest Seek Time First)
- **SCAN** (Elevator Algorithm)
- **C-SCAN** (Circular SCAN)
- **LOOK** (Look Elevator)

## Features
- Multi-algorithm selection (select and compare up to 5 algorithms).
- Real-time SVG bar chart with color-coded comparison of total head movement.
- Automatic detection and callout of **Best** (least seek time) and **Worst** (most seek time) algorithms.
- Full serviced track sequences and efficiency percentage analysis.
- Standalone C program (`disk.c`) implementing all 5 algorithms.

## How to Run

### Web Simulator
Open `index.html` in any modern web browser or start a local server:
```bash
python -m http.server 5500
```
Then visit `http://localhost:5500`.

### C Program
Compile and execute `disk.c`:
```bash
gcc disk.c -o disk.exe
./disk.exe
```

## Team Members
- Viraj Ravani — SYCM2-64
- Mahir Dhami — SYCM2-08
