struct DebugDraw {
    indirect_draw: DrawIndirectArgs,
    data: array<DebugDrawObject>,
}
/// Arguments for indirect draw calls
struct DrawIndirectArgs {
    vertex_count: u32,
    /// Number of objects
    instance_count: atomic<u32>,
    first_vertex: u32,
    first_instance: u32,
}
struct DebugDrawObject {
    /// 0 = line, 1 = rect, 2 = circle, 3 = text, etc
    kind: u32,
    /// Packed color
    color: u32,
    position: vec2f,
    size: vec2f,
}

@group(0) @binding(0)
var font_atlas: texture_2d<f32>;
@group(0) @binding(1)
var font_sampler: sampler;
@group(0) @binding(2) 
var<storage, read> debug_draw: DebugDraw;

struct VertexOutputDebug {
    /// In clip space
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @interpolate(flat) @location(1) instance: u32,
};

/// We're doing debug drawing in [0, 1] screen space
@vertex
fn vertex_debug(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32
) -> VertexOutputDebug {
    let obj = debug_draw.data[instance_index];
    var m = unit_matrix() * translation_matrix(vec3f(-1, 1, 0)) * scaling_matrix(vec3f(2, -2, 1));
    if obj.kind == 0 {
        // line
        // in the case of a line, we have start and end. Ignore the "position" and "size" names
        let dir = obj.size - obj.position;
        let angle = atan2(dir.y, dir.x);
        m *= translation_matrix(vec3f(obj.position, 0)) 
            * rotation_matrix(angle)
            * scaling_matrix(vec3f(length(dir), 2., 1.));
    } else if obj.kind == 1 {
        // circle
        m *= translation_matrix(vec3f(obj.position - obj.size, 0)) * scaling_matrix(vec3f(obj.size * 2.0, 1.));
    } else if obj.kind == 2 {
        // rect
        m *= translation_matrix(vec3f(obj.position, 0)) * scaling_matrix(vec3f(obj.size, 1.));
    } else {
        // digit (text)
        // x is the size, y is the value
        m = translation_matrix(vec3f(obj.position, 0)) 
            * scaling_matrix(vec3f(TEXT_SIZE * obj.size.x, 1.));
    }
    let position = m * vec4f(unit_quad[vertex_index], 0.0, 1.0);

    var result: VertexOutputDebug;
    result.position = position;
    result.uv = unit_quad[vertex_index];
    result.instance = instance_index;
    return result;
}

const TEXT_SIZE = vec2f(8, 16);
const unit_quad = array<vec2f, 6>(
    vec2f(0, 0),
    vec2f(0, 1),
    vec2f(1, 1),
    vec2f(0, 0),
    vec2f(1, 1),
    vec2f(1, 0),
);

@fragment
fn fragment_debug(vertex: VertexOutputDebug) -> @location(0) vec4<f32> {
    let obj = debug_draw.data[vertex.instance];
    let color = unpack4x8unorm(obj.color);
    if obj.kind == 0 {
        return color;
    } else if obj.kind == 1 {
        // circle
        let dist = distance(vertex.uv, vec2f(0.5));
        return vec4f(color.rgb, color.a * select(0., 1., dist <= 0.5));
    } else if obj.kind == 2 {
        // rect
        return color;
    } else {
        // text
        let char_index = obj.size.y;
        let atlas_pixel = vertex.uv * TEXT_SIZE + vec2f(char_index * TEXT_SIZE.x, 0);
        let img = textureSampleLevel(font_atlas, font_sampler, atlas_pixel / vec2f(textureDimensions(font_atlas)), 0.).r;
        return vec4f(color.rgb, color.a * img);
    }
}

fn unit_matrix() -> mat4x4f {
    return mat4x4(
        vec4f(1, 0, 0, 0),
        vec4f(0, 1, 0, 0),
        vec4f(0, 0, 1, 0),
        vec4f(0, 0, 0, 1),
    );
}

fn translation_matrix(translation: vec3f) -> mat4x4f {
    return mat4x4(
        vec4f(1, 0, 0, 0),
        vec4f(0, 1, 0, 0),
        vec4f(0, 0, 1, 0),
        vec4f(translation.xyz, 1),
    );
}

fn rotation_matrix(rotation: f32) -> mat4x4f {
    let s = sin(rotation);
    let c = cos(rotation);
    return mat4x4(
        vec4f(c, s, 0, 0),
        vec4f(-s, c, 0, 0),
        vec4f(0, 0, 0, 0),
        vec4f(0, 0, 0, 1),
    );
}

fn scaling_matrix(scaling: vec3f) -> mat4x4f {
    return mat4x4(
        vec4f(scaling.x, 0, 0, 0),
        vec4f(0, scaling.y, 0, 0),
        vec4f(0, 0, scaling.z, 0),
        vec4f(0, 0, 0, 1),
    );
}
