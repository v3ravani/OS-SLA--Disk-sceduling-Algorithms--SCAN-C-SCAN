#include <stdio.h>
#include <stdlib.h>

int fcfs(int req[], int n, int head) {
    int seek = 0, cur = head;
    for (int i = 0; i < n; i++) {
        seek += abs(req[i] - cur);
        cur = req[i];
    }
    return seek;
}

int sstf(int req[], int n, int head) {
    int seek = 0, cur = head;
    int visited[100] = {0};
    for (int i = 0; i < n; i++) {
        int min_d = 1000000, idx = -1;
        for (int j = 0; j < n; j++) {
            if (!visited[j] && abs(req[j] - cur) < min_d) {
                min_d = abs(req[j] - cur);
                idx = j;
            }
        }
        visited[idx] = 1;
        seek += min_d;
        cur = req[idx];
    }
    return seek;
}

void sort(int a[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }
}

int scan(int req[], int n, int head, int max_track) {
    int a[100];
    for (int i = 0; i < n; i++) a[i] = req[i];
    sort(a, n);
    int pos = 0;
    while (pos < n && a[pos] < head) pos++;
    int seek = 0, cur = head;
    for (int i = pos; i < n; i++) {
        seek += abs(a[i] - cur);
        cur = a[i];
    }
    if (pos > 0) {
        seek += abs(max_track - cur);
        cur = max_track;
        for (int i = pos - 1; i >= 0; i--) {
            seek += abs(a[i] - cur);
            cur = a[i];
        }
    }
    return seek;
}

int cscan(int req[], int n, int head, int max_track) {
    int a[100];
    for (int i = 0; i < n; i++) a[i] = req[i];
    sort(a, n);
    int pos = 0;
    while (pos < n && a[pos] < head) pos++;
    int seek = 0, cur = head;
    for (int i = pos; i < n; i++) {
        seek += abs(a[i] - cur);
        cur = a[i];
    }
    if (pos > 0) {
        seek += abs(max_track - cur);
        seek += max_track;
        cur = 0;
        for (int i = 0; i < pos; i++) {
            seek += abs(a[i] - cur);
            cur = a[i];
        }
    }
    return seek;
}

int look(int req[], int n, int head) {
    int a[100];
    for (int i = 0; i < n; i++) a[i] = req[i];
    sort(a, n);
    int pos = 0;
    while (pos < n && a[pos] < head) pos++;
    int seek = 0, cur = head;
    for (int i = pos; i < n; i++) {
        seek += abs(a[i] - cur);
        cur = a[i];
    }
    for (int i = pos - 1; i >= 0; i--) {
        seek += abs(a[i] - cur);
        cur = a[i];
    }
    return seek;
}

int main() {
    int req[] = {98, 183, 37, 122, 14, 124, 65, 67};
    int n = 8, head = 53, max_track = 199;

    int s_fcfs = fcfs(req, n, head);
    int s_sstf = sstf(req, n, head);
    int s_scan = scan(req, n, head, max_track);
    int s_cscan = cscan(req, n, head, max_track);
    int s_look = look(req, n, head);

    int results[] = {s_fcfs, s_sstf, s_scan, s_cscan, s_look};
    char *names[] = {"FCFS", "SSTF", "SCAN", "C-SCAN", "LOOK"};

    printf("Disk Scheduling Results:\n");
    for (int i = 0; i < 5; i++) {
        printf("%-7s : %d cylinders\n", names[i], results[i]);
    }

    int min_idx = 0, max_idx = 0;
    for (int i = 1; i < 5; i++) {
        if (results[i] < results[min_idx]) min_idx = i;
        if (results[i] > results[max_idx]) max_idx = i;
    }

    printf("\nBest  : %s (%d cylinders)\n", names[min_idx], results[min_idx]);
    printf("Worst : %s (%d cylinders)\n", names[max_idx], results[max_idx]);

    return 0;
}
