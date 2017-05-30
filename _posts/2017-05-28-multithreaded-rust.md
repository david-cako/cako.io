---
title: "Multithreaded Rust"
date: "2017-05-28 06:10:22"
---

# Multithreaded Rust

<sup>2017-05-28</sup>

Memory safety is one of the most pressing concerns in writing multithreaded applications.  Most programming languages will provide you with the tools necessary to avoid data races, however also the freedom to wrongly implement them. Consistent with Rust's theme of guarantees, **safety across threads is a guarantee.**

Rust seems like a very natural language to implement a multithreaded application in.  All shared data must either be borrowed immutably, deep copied, or *exclusively* borrowed mutably.

There are a few concepts that you need to float when understanding concurrency in Rust:

- An [`Arc`](https://doc.rust-lang.org/std/sync/struct.Arc.html) is a container which may be shared across threads and contains an immutable value of an arbitrary type

- A [`Mutex`](https://doc.rust-lang.org/std/sync/struct.Mutex.html) is a container which functions mostly like a traditional mutex, however *contains* a mutable value of an arbitrary type

- [`Channel`](https://doc.rust-lang.org/std/sync/mpsc/)s allow for message-passing between threads

## Creating threads
Threads are created with [`thread::spawn()`](https://doc.rust-lang.org/std/thread/)

```
thread::spawn(move || {
    do_something(foo)
});
```

`thread::spawn()` accepts a closure, and executes the contents of it in a new thread.  You will generally be passing a `move` closure, which tells Rust that we want the closure, and by extension the thread, to take ownership of any variables passed into it.  This is important, as a thread can exist for any arbitrary length of time, and there would be no way to guarantee that variables created in the enclosing scope will continue to exist.  This is an example of a common use-after-free scenario that Rust, by design, simply does not allow you to do.

## Design patterns
If you are familiar with threaded programming in other languages, Rust's interpretation will feel familiar.

Commonly you will want to create many threads at once, and then wait for all of them to complete.

This can be achieved by keeping a pool of `thread` s:

```
use std::thread;

let mut threads = vec![];
 
for i in 0..10 {
    threads.push(thread::spawn(move || {
        do_something(foo);
    }));
}

for thread in threads.into_iter()  {
    let thread = thread.join().unwrap();
    println!("thread return value: {}", thread);
}
 
```

You may also want to use channels for directional communication.

`channel` s are a great way to spawn a bunch of threads that continuously and asynchronously push data to a consumer.

```
use std::thread;
use std::sync::mpsc::channel;

let (tx, rx) = channel();
for i in 0..10 {
    let tx = tx.clone();
    thread::spawn(move|| {
        // pass the channel tx in as a buffer to write to
        do_something(foo, tx);
    });
}

for _ in 0..10 {
    let ret = rx.recv().unwrap();

    println!("something has been done!: {}", ret);
}
```