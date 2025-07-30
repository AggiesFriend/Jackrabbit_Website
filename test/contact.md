---
layout: page
title: "Contact the Author"
description: "Get in touch with questions, comments, or feedback about The Jackrabbit Series"
---

<div class="contact-container">
    <div class="contact-info">
        <h2>Get in Touch</h2>
        <p>Thank you for your interest in The Jackrabbit Series. Whether you have questions about the books, are interested in collaboration opportunities, or simply want to share your thoughts about the series, I'd love to hear from you.</p>
        
        <div class="contact-details">
            <div class="contact-item">
                <h3>About Your Message</h3>
                <p>Feel free to ask questions about the series, characters, or upcoming releases. I'm also open to feedback and suggestions!</p>
            </div>
            <div class="contact-item">
                <h3>Response Time</h3>
                <p>I aim to respond to all messages within 3-5 business days.</p>
            </div>
        </div>
    </div>
    
    <div class="contact-form">
        <form id="contact-form">
            <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" name="name" required>
            </div>
            
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" required></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary">Send Message</button>
        </form>
    </div>
</div>

<style>
.contact-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    margin-top: 2rem;
}

.contact-info h2 {
    font-family: 'Montserrat', sans-serif;
    margin-bottom: 1rem;
    text-align: left;
}

.contact-details {
    margin-top: 2rem;
}

.contact-item {
    margin-bottom: 2rem;
}

.contact-item h3 {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    color: #333;
}

.contact-form {
    background: #f8f9fa;
    padding: 2rem;
    border-radius: 8px;
}

@media (max-width: 768px) {
    .contact-container {
        grid-template-columns: 1fr;
        gap: 2rem;
    }
}
</style>

