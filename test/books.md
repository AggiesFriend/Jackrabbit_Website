---
layout: page
title: "The Jackrabbit Series"
description: "Explore the books that make up this epic science fiction saga"
---

<div class="books-list">
    <div class="book-item">
        <div class="book-cover">
            <img src="./images/Stolen_Freedom_base_front.png" alt="Stolen Freedom cover">
        </div>
        <div class="book-details">
            <h3>Stolen Freedom</h3>
            <p class="book-number">Book 1</p>
            <p class="book-description">In a remote mining colony where humans are treated as disposable commodities, young Jack stumbles upon the discovery of a lifetime: a damaged courier ship and an artificial intelligence named Aggie.</p>
            <div class="book-actions">
                <a href="{{ '/book1/' | relative_url }}" class="btn btn-primary">Read More</a>
                <a href="https://books.by/aggiesfriend/stolen-freedom" class="btn btn-secondary" target="_blank">Buy Paperback</a>
                <a href="https://amzn.eu/d/cLgZDtT" class="btn btn-secondary" target="_blank">Get eBook</a>
            </div>
        </div>
    </div>

    <div class="book-item">
        <div class="book-cover">
            <img src="./images/wings_of_freedom_cover.jpg" alt="Wings of Freedom cover">
        </div>
        <div class="book-details">
            <h3>Wings of Freedom</h3>
            <p class="book-number">Book 2</p>
            <p class="book-description">In a universe ruled by megacorporations, where freedom exists in the gaps between their influence, a boy and an artificial intelligence chart their own course.</p>
            <div class="book-actions">
                <a href="{{ '/book2/' | relative_url }}" class="btn btn-primary">Read More</a>
                <a href="https://books.by/aggiesfriend/wings-of-freedom" class="btn btn-secondary" target="_blank">Buy Paperback</a>
                <a href="https://amzn.eu/d/blZ6FaL" class="btn btn-secondary" target="_blank">Get eBook</a>
            </div>
        </div>
    </div>

    <div class="book-item">
        <div class="book-cover">
            <img src="./images/the_jackrabbit_emerges_base_front.jpg" alt="The Jackrabbit Emerges cover">
        </div>
        <div class="book-details">
            <h3>The Jackrabbit Emerges</h3>
            <p class="book-number">Book 3</p>
            <p class="book-description">In a fractured Dyson Array abandoned by the corporation that built it, Jack and Aggie discover a secret technology that could save hundreds of stranded survivors.</p>
            <div class="book-actions">
                <a href="{{ '/book3/' | relative_url }}" class="btn btn-primary">Read More</a>
            </div>
        </div>
    </div>

    <div class="book-item">
        <div class="book-cover">
            <img src="./images/coming_of_age_cover.png" alt="Coming of Age cover">
        </div>
        <div class="book-details">
            <h3>Coming of Age</h3>
            <p class="book-number">Book 4</p>
            <p class="book-description">Infiltrating the very corporate system he's been avoiding, Jack embarks on a multi-year journey of deception as a corporate courier.</p>
            <div class="book-actions">
                <a href="{{ '/book4/' | relative_url }}" class="btn btn-primary">Read More</a>
            </div>
        </div>
    </div>

    <div class="book-item">
        <div class="book-cover">
            <div class="placeholder-cover book3">
                <p>Book 5</p>
            </div>
        </div>
        <div class="book-details">
            <h3>The Proliferation</h3>
            <p class="book-number">Book 5</p>
            <p class="book-description">In the saga's conclusion, Jack and multiple versions of Aggie join forces with the resistance to challenge corporate dominance.</p>
            <div class="book-actions">
                <a href="{{ '/book5/' | relative_url }}" class="btn btn-primary">Read More</a>
            </div>
        </div>
    </div>
</div>

<style>
.books-list {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    margin-top: 2rem;
}

.book-item {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.book-cover {
    flex-shrink: 0;
    width: 200px;
    height: 300px;
}

.book-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
}

.book-details {
    flex: 1;
}

.book-details h3 {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #333;
}

.book-number {
    color: #007bff;
    font-weight: 500;
    margin-bottom: 1rem;
}

.book-description {
    margin-bottom: 1.5rem;
    line-height: 1.6;
}

.book-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

@media (max-width: 768px) {
    .book-item {
        flex-direction: column;
        text-align: center;
    }
    
    .book-cover {
        width: 150px;
        height: 225px;
        margin: 0 auto;
    }
}
</style>

